import { supabase } from '@/lib/supabase'
import { createOpportunity } from '@/lib/operations'
import type { JobMatchWithJob, ScrapedJob } from '@/types'

// ============================================================
// JOB MATCHES (read-side; scores are computed by scripts/syncFreshFitScores.ts)
// ============================================================

export async function getJobMatches(memberId: string): Promise<JobMatchWithJob[]> {
  const { data, error } = await supabase
    .from('job_matches')
    .select('*, scraped_job:scraped_jobs(*)')
    .eq('member_id', memberId)
    .is('dismissed_at', null)
    .order('fresh_fit_score', { ascending: false })

  if (error) {
    console.error('Error fetching job matches:', error)
    return []
  }

  return (data ?? []) as unknown as JobMatchWithJob[]
}

export async function dismissJobMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('job_matches')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', matchId)

  if (error) console.error('Error dismissing job match:', error)
}

/**
 * Promotes a scraped-job match into the real, member-visible `opportunities`
 * pipeline (strategist-only action, matches existing RLS on `opportunities`).
 * Marks the match as promoted so it drops out of the "pending review" queue.
 */
export async function promoteMatchToOpportunity(
  match: JobMatchWithJob,
  strategistId: string,
): Promise<string | null> {
  const job = match.scraped_job
  const opportunity = await createOpportunity({
    member_id: match.member_id,
    strategist_id: strategistId,
    employer: job.company,
    job_title: job.title,
    location: job.location,
    salary_text: job.salary_text,
    employment_type: job.employment_type,
    posting_url: job.posting_url,
    posting_date: job.posted_at,
    source: `Opportunity Engine (${job.source})`,
    full_job_description: job.description,
    why_it_matches: `FreshFit score ${match.fresh_fit_score}/100. Matched skills: ${match.matched_skills.join(', ') || 'none detected'}.`,
    status: 'needs_review',
  })

  if (!opportunity) return null

  const { error } = await supabase
    .from('job_matches')
    .update({ promoted_opportunity_id: opportunity.id })
    .eq('id', match.id)

  if (error) console.error('Error marking match as promoted:', error)

  return opportunity.id
}

// ============================================================
// STRATEGIST: matches across all assigned members
// ============================================================

export async function getJobMatchesForStrategist(memberIds: string[]): Promise<JobMatchWithJob[]> {
  if (memberIds.length === 0) return []

  const { data, error } = await supabase
    .from('job_matches')
    .select('*, scraped_job:scraped_jobs(*)')
    .in('member_id', memberIds)
    .is('dismissed_at', null)
    .is('promoted_opportunity_id', null)
    .order('fresh_fit_score', { ascending: false })

  if (error) {
    console.error('Error fetching strategist job matches:', error)
    return []
  }

  return (data ?? []) as unknown as JobMatchWithJob[]
}

export async function getActiveScrapedJobsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('scraped_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (error) {
    console.error('Error counting scraped jobs:', error)
    return 0
  }

  return count ?? 0
}

export type { ScrapedJob }
