import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { calculateSearchReadiness, getReadinessFixLink } from '@/lib/profile'
import { CircularProgress } from '@/components/CircularProgress'
import { TrendingUp, AlertCircle, Check, ArrowRight } from 'lucide-react'
import type { MemberProfile } from '@/types'

export function SearchReadinessWidget({ profile }: { profile: MemberProfile | null }) {
  const { score, missing } = useMemo(() => {
    if (!profile) return { score: 0, missing: [] }
    return calculateSearchReadiness(profile)
  }, [profile])

  const fixLink = useMemo(() => getReadinessFixLink(missing), [missing])

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <TrendingUp className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-serif text-base font-semibold text-neutral-900">Search Readiness</h3>
          <p className="text-xs text-neutral-500">Profile completeness</p>
        </div>
      </div>

      {/* Score */}
      <div className="mt-6 flex items-center justify-center">
        <CircularProgress value={score} size={128} strokeWidth={8} />
      </div>

      {/* Missing items */}
      {missing.length > 0 ? (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold text-neutral-700">Complete these to improve your readiness:</p>
          <ul className="space-y-2">
            {missing.slice(0, 5).map((item) => (
              <li key={item.field} className="flex items-start gap-2 text-sm text-neutral-600">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-500" />
                <span>{item.label}</span>
              </li>
            ))}
            {missing.length > 5 && (
              <li className="text-xs text-neutral-400">+ {missing.length - 5} more</li>
            )}
          </ul>
          <Link
            to={fixLink}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            Let&rsquo;s fix it
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-success-50 p-3">
          <Check className="h-5 w-5 text-success-600" />
          <p className="text-sm text-success-700">Your profile is complete. Your Strategist has everything needed.</p>
        </div>
      )}
    </div>
  )
}
