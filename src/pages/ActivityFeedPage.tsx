import { useEffect, useState } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { getActivityFeed } from '@/lib/communication'
import { timeAgo } from '@/lib/utils'
import {
  FileText, User, Search, CheckCircle2, Calendar, Loader2,
  Compass, Briefcase, Award, MessageSquare, FileCheck, TrendingUp,
} from 'lucide-react'
import type { ActivityFeedItem } from '@/types'

const activityIcons: Record<string, typeof User> = {
  resume_updated: FileText,
  questionnaire_completed: FileCheck,
  opportunity_added: Search,
  opportunity_approved: CheckCircle2,
  application_submitted: Briefcase,
  interview_scheduled: Calendar,
  friday_report_delivered: FileText,
  mock_interview_completed: Calendar,
  feedback_received: MessageSquare,
  joined: Compass,
  profile_updated: User,
  onboarding_completed: Award,
  offer_received: TrendingUp,
}

const activityColors: Record<string, string> = {
  resume_updated: 'bg-primary-100 text-primary-600',
  questionnaire_completed: 'bg-success-100 text-success-600',
  opportunity_added: 'bg-accent-100 text-accent-600',
  opportunity_approved: 'bg-success-100 text-success-600',
  application_submitted: 'bg-primary-600 text-white',
  interview_scheduled: 'bg-primary-100 text-primary-600',
  friday_report_delivered: 'bg-accent-100 text-accent-600',
  mock_interview_completed: 'bg-secondary-100 text-secondary-600',
  feedback_received: 'bg-primary-100 text-primary-600',
  joined: 'bg-primary-600 text-white',
  offer_received: 'bg-success-600 text-white',
}

export function ActivityFeedPage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getActivityFeed(user.id).then((data) => {
      setActivities(data)
      setLoading(false)
    })
  }, [user])

  return (
    <MemberLayout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Activity Feed</h1>
        <p className="mt-1 text-sm text-neutral-600">Everything that has happened in your career journey.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Compass className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">No activity yet. Your feed will populate as your career journey progresses.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 h-full w-0.5 bg-neutral-100" aria-hidden="true" />
          <ul className="space-y-4" aria-label="Activity feed">
            {activities.map((item) => {
              const Icon = activityIcons[item.activity_type] ?? CheckCircle2
              const colorClass = activityColors[item.activity_type] ?? 'bg-neutral-100 text-neutral-600'
              return (
                <li key={item.id} className="relative flex items-start gap-4">
                  <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colorClass} ring-4 ring-neutral-50`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                    {item.description && <p className="mt-0.5 text-sm text-neutral-600">{item.description}</p>}
                    <time className="mt-1 block text-xs text-neutral-400" dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </MemberLayout>
  )
}
