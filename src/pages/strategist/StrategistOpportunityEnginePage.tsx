import { useEffect, useState } from 'react'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAssignedMembers } from '@/lib/operations'
import { getJobMatchesForStrategist, promoteMatchToOpportunity } from '@/lib/opportunityEngine'
import { Loader2, MapPin, DollarSign, ExternalLink, ArrowUpRight, Sparkles } from 'lucide-react'
import type { JobMatchWithJob, MemberProfile } from '@/types'

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-success-100 text-success-700'
  if (score >= 50) return 'bg-primary-100 text-primary-700'
  return 'bg-neutral-100 text-neutral-600'
}

export function StrategistOpportunityEnginePage() {
  const { user, role } = useAuth()
  const [matches, setMatches] = useState<JobMatchWithJob[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [promotingId, setPromotingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    const assignments = await getAssignedMembers(user.id)
    const memberIds = assignments.map((a) => a.member_id)

    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds)

      const names: Record<string, string> = {}
      for (const p of (profiles ?? []) as Pick<MemberProfile, 'user_id' | 'full_name'>[]) {
        names[p.user_id] = p.full_name || 'Unknown Member'
      }
      setMemberNames(names)

      const jobMatches = await getJobMatchesForStrategist(memberIds)
      setMatches(jobMatches)
    }

    setLoading(false)
  }

  const handlePromote = async (match: JobMatchWithJob) => {
    if (!user) return
    setPromotingId(match.id)
    await promoteMatchToOpportunity(match, user.id)
    setMatches((prev) => prev.filter((m) => m.id !== match.id))
    setPromotingId(null)
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin={role === 'admin'}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin={role === 'admin'}>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          <Sparkles className="h-6 w-6 text-primary-600" />
          Opportunity Engine
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Auto-sourced job postings scored against each assigned member's Career Profile.
          Promote strong matches into their Opportunity Pipeline for review.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            No pending matches. Run the scraper + FreshFit sync scripts to populate this queue.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <div key={match.id} className="rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:border-primary-300">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor(match.fresh_fit_score)}`}>
                  FreshFit {match.fresh_fit_score}
                </span>
                <span className="truncate text-xs text-neutral-500">{memberNames[match.member_id] || 'Member'}</span>
              </div>

              <h3 className="font-serif text-sm font-semibold text-neutral-900">{match.scraped_job.title}</h3>
              <p className="text-sm text-primary-600 font-medium">{match.scraped_job.company}</p>

              <div className="mt-2 space-y-1 text-xs text-neutral-500">
                {match.scraped_job.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {match.scraped_job.location}
                  </div>
                )}
                {match.scraped_job.salary_text && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    {match.scraped_job.salary_text}
                  </div>
                )}
              </div>

              {match.matched_skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {match.matched_skills.slice(0, 4).map((skill) => (
                    <span key={skill} className="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                <a
                  href={match.scraped_job.posting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Posting
                </a>
                <button
                  onClick={() => handlePromote(match)}
                  disabled={promotingId === match.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {promotingId === match.id ? 'Promoting...' : 'Promote'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </StrategistLayout>
  )
}
