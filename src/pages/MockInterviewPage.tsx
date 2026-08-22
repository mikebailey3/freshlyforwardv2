import { useEffect, useState, type FormEvent } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  createCalendarEvent,
  createNotification,
} from '@/lib/communication'
import { formatDateTime, formatDate, cn } from '@/lib/utils'
import {
  Calendar, Plus, Loader2, Briefcase, Clock, CheckCircle2,
  Video, MessageSquare, X,
} from 'lucide-react'
import type { MockInterview } from '@/types'

const interviewTypes = [
  'Phone Screen',
  'Technical',
  'Behavioral',
  'Case Study',
  'Panel',
  'Final Round',
  'Mock / Practice',
] as const

const focusAreas = [
  'General Practice',
  'Behavioral Questions',
  'Technical Assessment',
  'Case Interview',
  'Salary Negotiation',
  'Confidence & Body Language',
  'Storytelling / STAR Method',
  'Company-Specific Prep',
] as const

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-Show',
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-primary-100 text-primary-700',
  completed: 'bg-success-100 text-success-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
  no_show: 'bg-error-100 text-error-700',
}

export function MockInterviewPage() {
  const { profile } = useAuth()
  const [interviews, setInterviews] = useState<MockInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [interviewType, setInterviewType] = useState<string>('Mock / Practice')
  const [scheduledAt, setScheduledAt] = useState('')
  const [focusArea, setFocusArea] = useState<string>('General Practice')

  useEffect(() => {
    if (!profile) return
    loadInterviews()
  }, [profile])

  const loadInterviews = async () => {
    if (!profile) return
    const { data, error } = await supabase
      .from('mock_interviews')
      .select('*')
      .eq('user_id', profile.id)
      .order('scheduled_at', { ascending: false })
    if (error) {
      console.error('Error loading mock interviews:', error)
    }
    setInterviews((data as MockInterview[]) || [])
    setLoading(false)
  }

  const resetForm = () => {
    setCompany('')
    setPosition('')
    setInterviewType('Mock / Practice')
    setScheduledAt('')
    setFocusArea('General Practice')
    setError(null)
  }

  const handleBook = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !scheduledAt) return
    setSubmitting(true)
    setError(null)

    // Insert mock interview
    const { data, error: insertError } = await supabase
      .from('mock_interviews')
      .insert({
        user_id: profile.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        focus_area: focusArea,
        status: 'scheduled',
        company: company || null,
        position: position || null,
        interview_type: interviewType,
        meeting_platform: 'Microsoft Teams',
      })
      .select('*')
      .maybeSingle()

    if (insertError || !data) {
      setError('Could not book the mock interview. Please try again.')
      setSubmitting(false)
      return
    }

    const interview = data as MockInterview

    // Create calendar event
    await createCalendarEvent({
      user_id: profile.id,
      event_type: 'mock_interview',
      title: `Mock Interview${company ? ` — ${company}` : ''}${position ? ` (${position})` : ''}`,
      description: `Focus area: ${focusArea}. Interview type: ${interviewType}.`,
      start_at: interview.scheduled_at,
      metadata: {
        mock_interview_id: interview.id,
        company,
        position,
        interview_type: interviewType,
      },
    })

    // Create notification
    await createNotification({
      user_id: profile.id,
      notification_type: 'mock_interview_reminder',
      title: 'Mock Interview Scheduled',
      body: `Your mock interview${company ? ` with ${company}` : ''} is scheduled for ${formatDateTime(interview.scheduled_at)}.`,
      is_read: false,
    })

    setInterviews((prev) => [interview, ...prev])
    resetForm()
    setShowForm(false)
    setSubmitting(false)
  }

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from('mock_interviews')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) {
      console.error('Error cancelling interview:', error)
      return
    }
    setInterviews((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'cancelled' } : i))
    )
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

  const upcoming = interviews.filter((i) => i.status === 'scheduled' && new Date(i.scheduled_at) >= new Date())
  const past = interviews.filter((i) => i.status === 'completed' || (i.status === 'scheduled' && new Date(i.scheduled_at) < new Date()))
  const cancelled = interviews.filter((i) => i.status === 'cancelled')

  return (
    <MemberLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Mock Interviews
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Practice with your Career Strategist before the real thing. Build confidence, refine your answers, and get expert feedback. All mock interviews take place over Microsoft Teams — your strategist will send the meeting link before your scheduled time.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Book Interview'}
        </button>
      </div>

      {/* Booking form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 animate-fade-in">
          <h2 className="font-serif text-lg font-semibold text-neutral-900">Book a Mock Interview</h2>
          <form onSubmit={handleBook} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mi-company" className="block text-sm font-medium text-neutral-700">
                  Company <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="mi-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="mi-position" className="block text-sm font-medium text-neutral-700">
                  Position <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="mi-position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mi-type" className="block text-sm font-medium text-neutral-700">
                  Interview Type
                </label>
                <select
                  id="mi-type"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {interviewTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mi-datetime" className="block text-sm font-medium text-neutral-700">
                  Preferred Date &amp; Time
                </label>
                <input
                  id="mi-datetime"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="mi-focus" className="block text-sm font-medium text-neutral-700">
                Focus Area
              </label>
              <select
                id="mi-focus"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {focusAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-700">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !scheduledAt}
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Confirm Booking
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming interviews */}
      <section className="mb-6" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 font-serif text-lg font-semibold text-neutral-900">
          Upcoming Interviews
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">
              No upcoming mock interviews. Click "Book Interview" to schedule one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((iv) => (
              <InterviewCard key={iv.id} interview={iv} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </section>

      {/* Interview history */}
      {past.length > 0 && (
        <section className="mb-6" aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 font-serif text-lg font-semibold text-neutral-900">
            Interview History
          </h2>
          <div className="space-y-3">
            {past.map((iv) => (
              <InterviewCard key={iv.id} interview={iv} onCancel={handleCancel} />
            ))}
          </div>
        </section>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section aria-labelledby="cancelled-heading">
          <h2 id="cancelled-heading" className="mb-4 font-serif text-lg font-semibold text-neutral-900">
            Cancelled
          </h2>
          <div className="space-y-3">
            {cancelled.map((iv) => (
              <InterviewCard key={iv.id} interview={iv} onCancel={handleCancel} />
            ))}
          </div>
        </section>
      )}
    </MemberLayout>
  )
}

function InterviewCard({
  interview,
  onCancel,
}: {
  interview: MockInterview
  onCancel: (id: string) => void
}) {
  const hasFeedback = !!interview.feedback
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <Briefcase className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  statusColors[interview.status] || 'bg-neutral-100 text-neutral-600'
                )}
              >
                {statusLabels[interview.status] || interview.status}
              </span>
              {hasFeedback && (
                <span className="flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-medium text-success-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Feedback Ready
                </span>
              )}
            </div>
            {interview.focus_area && (
              <h3 className="mt-2 font-serif text-base font-semibold text-neutral-900">
                {interview.focus_area}
              </h3>
            )}
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-600">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(interview.scheduled_at)}
            </p>
            {interview.status === 'scheduled' && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                <Video className="h-3.5 w-3.5 text-primary-500" />
                {interview.meeting_link ? (
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-600 hover:underline"
                  >
                    Join via {interview.meeting_platform || 'Microsoft Teams'}
                  </a>
                ) : (
                  <span>
                    Meeting via {interview.meeting_platform || 'Microsoft Teams'} — your strategist will send the link soon
                  </span>
                )}
              </p>
            )}
            {interview.feedback && (
              <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
                <p className="flex items-center gap-1.5 font-medium text-neutral-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Strategist Feedback
                </p>
                <p className="mt-1 whitespace-pre-wrap">{interview.feedback}</p>
              </div>
            )}
          </div>
        </div>
        {interview.status === 'scheduled' && (
          <button
            onClick={() => onCancel(interview.id)}
            className="flex-shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-error-600"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
