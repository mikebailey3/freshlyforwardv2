import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { useBadges } from '@/hooks/useBadges'
import { AchievementBadgeCircle } from '@/components/Badges'
import { getTimeline } from '@/lib/profile'
import { formatDate } from '@/lib/utils'
import { Map, Loader2, MessageSquare, Flag, CheckCircle2 } from 'lucide-react'
import type { CareerTimelineEvent } from '@/types'

export function RoadmapPage() {
  const { user } = useAuth()
  const { earnedBadges, hasBadge } = useBadges(user?.id)
  const [milestones, setMilestones] = useState<CareerTimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getTimeline(user.id).then((data) => {
      setMilestones(data.filter((e) => e.event_type === 'career_roadmap' || e.event_type === 'promotion_coaching'))
      setLoading(false)
    })
  }, [user])

  const careerBuilderBadge = earnedBadges.find((mb) => mb.badge?.slug === 'career-builder')?.badge

  return (
    <MemberLayout>
      <div className="mb-6 flex items-center gap-2">
        <Map className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Career Roadmap</h1>
          <p className="mt-1 text-sm text-neutral-600">
            A long-term, personalized plan for where your career goes next.
          </p>
        </div>
      </div>

      {careerBuilderBadge && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-accent-200 bg-accent-50 p-5">
          <AchievementBadgeCircle badge={careerBuilderBadge} size="md" />
          <div>
            <p className="font-serif text-sm font-semibold text-neutral-900">Career Builder badge earned!</p>
            <p className="text-xs text-neutral-600">You completed a full Career Roadmap with your strategist.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : milestones.length > 0 ? (
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                <Flag className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{m.event_title}</p>
                {m.event_description && <p className="text-sm text-neutral-600">{m.event_description}</p>}
                <p className="mt-1 text-xs text-neutral-400">{formatDate(m.event_date)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Map className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            Your roadmap hasn't been built yet. Your Career Strategist will work with you to map out
            promotion timelines, skill goals, and long-term milestones.
          </p>
          <Link
            to="/messages"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <MessageSquare className="h-4 w-4" />
            Ask your Strategist to build one
          </Link>
        </div>
      )}

      {hasBadge('goal-achieved') && (
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-success-50 p-4 text-success-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">You've achieved a major career goal on your roadmap. Nicely done.</p>
        </div>
      )}
    </MemberLayout>
  )
}
