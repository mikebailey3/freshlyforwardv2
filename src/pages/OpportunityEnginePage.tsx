import { useEffect, useState } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { getJobMatches, dismissJobMatch } from '@/lib/opportunityEngine'
import { Loader2, MapPin, DollarSign, ExternalLink, X, Sparkles } from 'lucide-react'
import type { JobMatchWithJob } from '@/types'

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-success-100 text-success-700'
  if (score >= 50) return 'bg-primary-100 text-primary-700'
  return 'bg-neutral-100 text-neutral-600'
}

export function OpportunityEnginePage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<JobMatchWithJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getJobMatches(user.id).then((data) => {
      setMatches(data)
      setLoading(false)
    })
  }, [user])

  const handleDismiss = async (matchId: string) => {
    await dismissJobMatch(matchId)
    setMatches((prev) => prev.filter((m) => m.id !== matchId))
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          <Sparkles className="h-6 w-6 text-primary-600" />
          Opportunity Engine
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Job postings automatically matched against your Career Profile, scored by FreshFit.
          Strong matches get promoted to your Career Strategist for review.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            No matches yet. Keep your Career Profile (skills, preferred roles) up to date to improve matching.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${scoreColor(match.fresh_fit_score)}`}>
                      FreshFit {match.fresh_fit_score}
                    </span>
                    {match.promoted_opportunity_id && (
                      <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700">
                        Sent to Strategist
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-semibold text-neutral-900">{match.scraped_job.title}</h3>
                  <p className="text-sm text-neutral-600">{match.scraped_job.company}</p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                    {match.scraped_job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {match.scraped_job.location}
                      </span>
                    )}
                    {match.scraped_job.salary_text && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {match.scraped_job.salary_text}
                      </span>
                    )}
                  </div>

                  {match.matched_skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {match.matched_skills.map((skill) => (
                        <span key={skill} className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <a
                    href={match.scraped_job.posting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Posting
                  </a>
                </div>

                <button
                  onClick={() => handleDismiss(match.id)}
                  aria-label="Dismiss match"
                  className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </MemberLayout>
  )
}
