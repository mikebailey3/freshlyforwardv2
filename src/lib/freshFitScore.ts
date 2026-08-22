import type { MemberProfile, ScrapedJob, JobMatchScoreBreakdown } from '@/types'

/**
 * FreshFit Score — pure, deterministic resume<->job matching.
 *
 * No LLM, no external API calls: this is a weighted keyword/profile
 * overlap heuristic, intentionally simple (YAGNI) and fully explainable
 * to a member ("you matched on these skills, missing these"). Swap this
 * out for something fancier later if the heuristic proves too coarse --
 * everything downstream (job_matches table, UI) only cares about the
 * { score, matchedSkills, missingSkills, breakdown } shape.
 *
 * Weights (sum to 100):
 *   - skillsCoverage  50pts — member.skills[] found in the job description
 *   - roleRelevance   25pts — job title vs preferred_jobs[] / past titles
 *   - locationFit     15pts — remote/relocate/same-area alignment
 *   - keywordDensity  10pts — general profile-text vs JD word overlap
 */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'with', 'you', 'your', 'our', 'a', 'an', 'to',
  'of', 'in', 'on', 'is', 'be', 'will', 'we', 'this', 'that', 'as', 'or',
  'at', 'by', 'from', 'have', 'has', 'it', 'its', 'their', 'they', 'who',
  'all', 'can', 'able', 'strong', 'work', 'working', 'job', 'role', 'team',
])

// A broad, general-career skill dictionary (not tech-only, matches
// FreshlyForward's general career-concierge audience). Extend as needed.
export const SKILL_KEYWORDS = [
  'communication', 'leadership', 'management', 'project management',
  'customer service', 'sales', 'marketing', 'accounting', 'bookkeeping',
  'budgeting', 'forecasting', 'analytics', 'data analysis', 'excel',
  'powerpoint', 'word', 'microsoft office', 'scheduling', 'logistics',
  'inventory', 'supply chain', 'operations', 'negotiation', 'recruiting',
  'onboarding', 'training', 'coaching', 'mentoring', 'public speaking',
  'writing', 'editing', 'social media', 'seo', 'content creation',
  'customer support', 'call center', 'crm', 'salesforce', 'quickbooks',
  'sql', 'python', 'javascript', 'java', 'html', 'css', 'react',
  'cloud computing', 'aws', 'azure', 'devops', 'cybersecurity',
  'network administration', 'help desk', 'troubleshooting',
  'nursing', 'patient care', 'clinical', 'medical billing', 'phlebotomy',
  'healthcare', 'compliance', 'regulatory', 'quality assurance',
  'quality control', 'manufacturing', 'warehouse', 'forklift',
  'construction', 'electrical', 'plumbing', 'hvac', 'welding',
  'retail', 'merchandising', 'point of sale', 'cash handling',
  'hospitality', 'food service', 'event planning', 'human resources',
  'payroll', 'benefits administration', 'legal', 'paralegal',
  'contract negotiation', 'procurement', 'vendor management',
  'strategic planning', 'business development', 'account management',
  'client relations', 'presentation', 'data entry', 'typing',
  'problem solving', 'critical thinking', 'time management',
  'organization', 'multitasking', 'teamwork', 'collaboration',
  'bilingual', 'spanish', 'graphic design', 'adobe photoshop',
  'video editing', 'ui/ux', 'agile', 'scrum', 'kanban',
]

function normalize(text: string): string {
  return (text || '').toLowerCase()
}

function findSkillsInText(text: string, dictionary: string[] = SKILL_KEYWORDS): string[] {
  const normalized = normalize(text)
  return dictionary.filter((skill) => normalized.includes(skill))
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word)),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const word of a) {
    if (b.has(word)) intersection++
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function scoreSkillsCoverage(memberSkills: string[], jdSkills: string[]): { points: number; matched: string[]; missing: string[] } {
  const memberSet = new Set(memberSkills.map(normalize))
  const matched = jdSkills.filter((skill) => memberSet.has(skill))
  const missing = jdSkills.filter((skill) => !memberSet.has(skill))

  if (jdSkills.length === 0) return { points: 25, matched: [], missing: [] } // no skills detected in JD -- neutral half-credit

  const coverage = matched.length / jdSkills.length
  return { points: Math.round(coverage * 50), matched, missing: missing.slice(0, 8) }
}

function scoreRoleRelevance(profile: MemberProfile, job: ScrapedJob): number {
  const titleTokens = tokenize(job.title)
  const candidateTitles = [
    ...(profile.preferred_jobs || []),
    ...(profile.employment_history || []).map((e) => e.title),
  ].join(' ')
  const candidateTokens = tokenize(candidateTitles)

  if (candidateTokens.size === 0) return 10 // no signal -- small neutral credit
  return Math.round(jaccardSimilarity(titleTokens, candidateTokens) * 25)
}

function scoreLocationFit(profile: MemberProfile, job: ScrapedJob): number {
  const jobLocation = normalize(job.location || '')
  const isRemoteJob = jobLocation.includes('remote')

  if (isRemoteJob && (profile.remote_preference === 'remote' || profile.remote_preference === 'hybrid')) {
    return 15
  }

  const memberLocation = normalize(profile.location || '')
  if (memberLocation && jobLocation && jobLocation.includes(memberLocation.split(',')[0].trim())) {
    return 15
  }

  if (profile.willing_to_relocate) return 8

  if (!profile.location && !isRemoteJob) return 5 // no location on file -- small neutral credit

  return 0
}

function scoreKeywordDensity(profile: MemberProfile, job: ScrapedJob): number {
  const profileText = [profile.summary, profile.headline, profile.career_goals, profile.strengths]
    .filter(Boolean)
    .join(' ')
  const jdText = `${job.title} ${job.description}`

  return Math.round(jaccardSimilarity(tokenize(profileText), tokenize(jdText)) * 10)
}

export interface FreshFitResult {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  breakdown: JobMatchScoreBreakdown
}

export function computeFreshFitScore(profile: MemberProfile, job: ScrapedJob): FreshFitResult {
  const jdSkills = findSkillsInText(`${job.title} ${job.description}`)
  const skillsResult = scoreSkillsCoverage(profile.skills || [], jdSkills)
  const roleRelevance = scoreRoleRelevance(profile, job)
  const locationFit = scoreLocationFit(profile, job)
  const keywordDensity = scoreKeywordDensity(profile, job)

  const score = Math.min(100, skillsResult.points + roleRelevance + locationFit + keywordDensity)

  return {
    score,
    matchedSkills: skillsResult.matched.slice(0, 10),
    missingSkills: skillsResult.missing,
    breakdown: {
      skillsCoverage: skillsResult.points,
      roleRelevance,
      locationFit,
      keywordDensity,
    },
  }
}
