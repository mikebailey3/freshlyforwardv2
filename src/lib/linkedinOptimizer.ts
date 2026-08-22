import { SKILL_KEYWORDS } from '@/lib/freshFitScore'
import type { LinkedInProfileData } from '@/types'

/**
 * LinkedIn Optimizer — pure, deterministic profile-copy scoring.
 *
 * Same philosophy as freshFitScore.ts: no LLM, no external calls, a
 * fully explainable rule-based heuristic a member can act on immediately.
 * "Syncing" with LinkedIn means the member pastes their current content
 * here (LinkedIn's API doesn't grant third-party read access to profile
 * data, and scraping linkedin.com is a ToS violation this app won't do)
 * -- see the migration file for the full disclaimer.
 *
 * Weights (sum to 100):
 *   - headline     20pts
 *   - about        30pts
 *   - experience   30pts
 *   - skills       20pts
 */

export interface SectionResult {
  points: number
  maxPoints: number
  issues: string[]
  suggestion: string | null
}

export interface LinkedInOptimizerResult {
  score: number
  headline: SectionResult
  about: SectionResult
  experience: SectionResult
  skills: SectionResult
}

// Phrases recruiters see so often they've become noise -- flagging these
// isn't about being harsh, it's that they carry zero differentiating signal.
const CLICHES = [
  'hardworking', 'hard-working', 'team player', 'results-driven', 'results driven',
  'go-getter', 'detail-oriented', 'detail oriented', 'self-starter', 'self starter',
  'think outside the box', 'synergy', 'passionate about', 'excellent communication skills',
  'dynamic professional', 'proven track record', 'highly motivated',
]

// Weak, passive bullet openers -- the classic resume/LinkedIn tell that
// someone described their job description instead of their impact.
const WEAK_OPENERS = [
  'responsible for', 'duties included', 'duties include', 'worked on', 'worked with',
  'helped with', 'helped to', 'in charge of', 'tasked with', 'assisted with',
  'was responsible', 'my role', 'job duties',
]

// Rough keyword -> strong-verb mapping used to rewrite a weak bullet.
// Deliberately simple pattern matching (YAGNI) -- good enough to nudge a
// member toward action language without pretending to understand intent.
const VERB_MAP: [RegExp, string][] = [
  [/\b(team|staff|employee|report)/i, 'Led'],
  [/\b(revenue|client|customer acquisition|deal)/i, 'Drove'],
  [/\b(process|system|workflow|procedure)/i, 'Streamlined'],
  [/\b(customer|support|service|complaint)/i, 'Resolved'],
  [/\b(budget|cost|expense|spend)/i, 'Managed'],
  [/\b(train|onboard|mentor|coach)/i, 'Trained'],
  [/\b(launch|project|initiative|rollout)/i, 'Launched'],
  [/\b(report|analysis|data|metric)/i, 'Analyzed'],
]

function hasMetric(text: string): boolean {
  return /\d/.test(text) || /%/.test(text) || /\$/.test(text)
}

function findCliches(text: string): string[] {
  const normalized = text.toLowerCase()
  return CLICHES.filter((c) => normalized.includes(c))
}

/** Strips a weak opener and prepends a context-appropriate strong verb. */
export function rewriteBullet(bullet: string): string {
  let text = bullet.trim()
  const lower = text.toLowerCase()

  for (const opener of WEAK_OPENERS) {
    if (lower.startsWith(opener)) {
      text = text.slice(opener.length).trim()
      break
    }
  }
  text = text.replace(/^(for|to|with)\s+/i, '')
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  const verb = VERB_MAP.find(([pattern]) => pattern.test(text))?.[1] || 'Delivered'
  const rewritten = text ? `${verb} ${text.charAt(0).toLowerCase()}${text.slice(1)}` : `${verb} [describe the work]`

  return hasMetric(rewritten)
    ? rewritten
    : `${rewritten} — [quantify it: e.g., "by 20%", "for 50+ clients", "saving 5 hrs/week"]`
}

export function generateHeadlineSuggestion(targetRole: string | null, skills: string[]): string {
  const role = targetRole?.trim() || 'Your Target Role'
  const topSkills = skills.slice(0, 2).join(' & ') || 'Your Top Skills'
  return `${role} | ${topSkills} | Helping [audience] achieve [outcome]`
}

function analyzeHeadline(headline: string, targetRole: string | null, skills: string[]): SectionResult {
  const issues: string[] = []
  let points = 0
  const text = headline.trim()

  if (!text) {
    return {
      points: 0,
      maxPoints: 20,
      issues: ['No headline set — this is the single most-viewed line on your profile, shown in every search result and comment you make.'],
      suggestion: generateHeadlineSuggestion(targetRole, skills),
    }
  }

  points += text.length >= 40 ? 8 : text.length >= 15 ? 4 : 0
  if (text.length < 40) issues.push('Headline is short — aim for 40-220 characters to use the full search-visible space.')

  const hasStructure = /[|•·]/.test(text)
  if (hasStructure) points += 6
  else issues.push('No separator (e.g. "|") — structured headlines ("Role | Specialty | Value") scan faster than a plain job title.')

  const cliches = findCliches(text)
  if (cliches.length > 0) {
    issues.push(`Generic phrase(s) found: "${cliches.join('", "')}" — these show up on thousands of profiles and add no signal.`)
  } else {
    points += 3
  }

  const normalized = text.toLowerCase()
  const mentionsRole = targetRole ? normalized.includes(targetRole.toLowerCase()) : false
  const mentionsSkill = skills.some((s) => normalized.includes(s.toLowerCase()))
  if (mentionsRole || mentionsSkill) points += 3
  else issues.push('Headline doesn\'t mention your target role or any listed skill — recruiters search by keyword.')

  return {
    points: Math.min(20, points),
    maxPoints: 20,
    issues,
    suggestion: issues.length > 0 ? generateHeadlineSuggestion(targetRole, skills) : null,
  }
}

function analyzeAbout(about: string): SectionResult {
  const issues: string[] = []
  let points = 0
  const text = about.trim()

  if (!text) {
    return {
      points: 0,
      maxPoints: 30,
      issues: ['About section is empty — this is where recruiters decide if you\'re worth a closer look before your resume ever comes up.'],
      suggestion: 'Start with who you help and how (1-2 sentences), then 2-3 concrete achievements with numbers, and close with what you\'re looking for next.',
    }
  }

  if (text.length >= 800) points += 12
  else if (text.length >= 300) points += 7
  else issues.push('About section is short — LinkedIn gives you up to 2,600 characters; 3-5 short paragraphs (roughly 800+ characters) is the professional norm.')

  if (hasMetric(text)) points += 10
  else issues.push('No numbers found — quantify at least one achievement (e.g. "grew revenue 30%", "managed a team of 12").')

  const cliches = findCliches(text)
  if (cliches.length > 0) {
    issues.push(`Generic phrase(s) found: "${cliches.join('", "')}" — replace with a specific, provable detail instead.`)
  } else {
    points += 4
  }

  const hasCallToAction = /(reach out|connect|message me|let's talk|feel free to contact|get in touch)/i.test(text)
  if (hasCallToAction) points += 4
  else issues.push('No closing call-to-action — invite people to connect or message you.')

  return {
    points: Math.min(30, points),
    maxPoints: 30,
    issues,
    suggestion: issues.length > 0
      ? 'Lead with impact, back it with a number, close with an invitation to connect.'
      : null,
  }
}

function analyzeExperience(bulletsText: string): SectionResult {
  const bullets = bulletsText
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)

  if (bullets.length === 0) {
    return {
      points: 0,
      maxPoints: 30,
      issues: ['No experience bullets added yet — paste a few lines from your LinkedIn Experience section (one per line).'],
      suggestion: null,
    }
  }

  let weakCount = 0
  let quantifiedCount = 0
  const weakBullets: string[] = []

  for (const bullet of bullets) {
    const lower = bullet.toLowerCase()
    const isWeak = WEAK_OPENERS.some((opener) => lower.startsWith(opener)) || /^i\s/i.test(bullet)
    if (isWeak) {
      weakCount++
      weakBullets.push(bullet)
    }
    if (hasMetric(bullet)) quantifiedCount++
  }

  const strongRatio = 1 - weakCount / bullets.length
  const quantifiedRatio = quantifiedCount / bullets.length

  const points = Math.round(strongRatio * 18 + quantifiedRatio * 12)

  const issues: string[] = []
  if (weakCount > 0) {
    issues.push(`${weakCount} of ${bullets.length} bullet(s) open with a weak/passive phrase (e.g. "Responsible for") instead of a strong action verb.`)
  }
  if (quantifiedCount < bullets.length) {
    issues.push(`${bullets.length - quantifiedCount} of ${bullets.length} bullet(s) have no number, %, or $ — quantified impact is far more credible than a duty description.`)
  }

  const suggestion = weakBullets.length > 0
    ? `Example rewrite: "${weakBullets[0]}" → "${rewriteBullet(weakBullets[0])}"`
    : null

  return { points: Math.min(30, points), maxPoints: 30, issues, suggestion }
}

function analyzeSkills(skills: string[]): SectionResult {
  const issues: string[] = []
  let points = 0
  const count = skills.filter(Boolean).length

  if (count === 0) {
    return {
      points: 0,
      maxPoints: 20,
      issues: ['No skills listed — profiles with 5+ skills get shown in significantly more recruiter searches.'],
      suggestion: null,
    }
  }

  if (count >= 15) points += 14
  else if (count >= 5) points += 8 + Math.round(((count - 5) / 10) * 6)
  else issues.push(`Only ${count} skill(s) listed — add at least 5 (LinkedIn allows up to 50) to show up in more searches.`)

  const recognized = skills.filter((s) => SKILL_KEYWORDS.some((k) => s.toLowerCase().includes(k)))
  if (recognized.length >= 3) points += 6
  else issues.push('Few of your skills match common recruiter search terms for your field — consider adding widely-searched keywords.')

  return { points: Math.min(20, points), maxPoints: 20, issues, suggestion: null }
}

export function computeLinkedInScore(
  profile: Pick<LinkedInProfileData, 'headline' | 'about' | 'experience_bullets' | 'skills' | 'target_role'>,
): LinkedInOptimizerResult {
  const headline = analyzeHeadline(profile.headline, profile.target_role, profile.skills)
  const about = analyzeAbout(profile.about)
  const experience = analyzeExperience(profile.experience_bullets)
  const skills = analyzeSkills(profile.skills)

  const score = headline.points + about.points + experience.points + skills.points

  return { score, headline, about, experience, skills }
}
