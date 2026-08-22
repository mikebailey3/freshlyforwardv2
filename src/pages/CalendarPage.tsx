import { useEffect, useState, useMemo } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { AddCalendarEventModal } from '@/components/AddCalendarEventModal'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCalendarEvents } from '@/lib/communication'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import {
  Calendar, ChevronLeft, ChevronRight, Loader2, Briefcase,
  Video, FileText, CreditCard, Clock, Users, Bell, MapPin, Plus,
} from 'lucide-react'
import type { CalendarEvent, MockInterview, FridayReport, Application } from '@/types'

interface UnifiedEvent {
  id: string
  event_type: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  meeting_link: string | null
  source: 'calendar' | 'mock_interview' | 'friday_report'
}

const eventTypeMeta: Record<string, { label: string; icon: typeof Calendar; color: string; dot: string }> = {
  mock_interview: { label: 'Mock Interview', icon: Briefcase, color: 'text-primary-700 bg-primary-50', dot: 'bg-primary-600' },
  real_interview: { label: 'Real Interview', icon: Briefcase, color: 'text-primary-700 bg-primary-50', dot: 'bg-primary-600' },
  career_review: { label: 'Career Review Session', icon: Users, color: 'text-secondary-700 bg-secondary-50', dot: 'bg-secondary-600' },
  membership_renewal: { label: 'Membership Renewal', icon: CreditCard, color: 'text-accent-700 bg-accent-50', dot: 'bg-accent-500' },
  friday_report: { label: 'Friday Report', icon: FileText, color: 'text-accent-700 bg-accent-50', dot: 'bg-accent-500' },
  strategist_meeting: { label: 'Strategist Meeting', icon: Users, color: 'text-secondary-700 bg-secondary-50', dot: 'bg-secondary-600' },
  reminder: { label: 'Reminder', icon: Bell, color: 'text-neutral-700 bg-neutral-100', dot: 'bg-neutral-500' },
  default: { label: 'Event', icon: Calendar, color: 'text-neutral-700 bg-neutral-100', dot: 'bg-neutral-400' },
}

function getEventMeta(type: string) {
  return eventTypeMeta[type] || eventTypeMeta.default
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CalendarPage() {
  const { profile } = useAuth()
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadEvents()
  }, [profile])

  const loadEvents = async () => {
    if (!profile) return
    const [calEvents, mockData, reportData, interviewApps] = await Promise.all([
      getCalendarEvents(profile.id),
      supabase
        .from('mock_interviews')
        .select('*')
        .eq('user_id', profile.id)
        .order('scheduled_at', { ascending: true })
        .then(({ data }) => (data as MockInterview[]) || []),
      supabase
        .from('friday_reports')
        .select('*')
        .eq('user_id', profile.id)
        .in('approval_status', ['approved', 'sent'])
        .order('report_date', { ascending: true })
        .then(({ data }) => (data as FridayReport[]) || []),
      supabase
        .from('applications')
        .select('*')
        .eq('member_id', profile.id)
        .not('interview_date', 'is', null)
        .order('interview_date', { ascending: true })
        .then(({ data }) => (data as Application[]) || []),
    ])

    const unified: UnifiedEvent[] = [
      ...calEvents.map((e: CalendarEvent) => ({
        id: e.id,
        event_type: e.event_type,
        title: e.title,
        description: e.description,
        start_at: e.start_at,
        end_at: e.end_at,
        location: e.location,
        meeting_link: e.meeting_link,
        source: 'calendar' as const,
      })),
      ...mockData
        .filter((m) => m.status === 'scheduled')
        .map((m) => ({
          id: `mi-${m.id}`,
          event_type: 'mock_interview',
          title: `Mock Interview${m.focus_area ? ` — ${m.focus_area}` : ''}`,
          description: null,
          start_at: m.scheduled_at,
          end_at: null,
          location: null,
          meeting_link: null,
          source: 'mock_interview' as const,
        })),
      ...reportData.map((r) => ({
        id: `fr-${r.id}`,
        event_type: 'friday_report',
        title: r.title,
        description: r.summary,
        start_at: r.report_date,
        end_at: null,
        location: null,
        meeting_link: null,
        source: 'friday_report' as const,
      })),
      ...interviewApps.map((a) => ({
        id: `int-${a.id}`,
        event_type: 'real_interview',
        title: `Interview — ${a.job_title} @ ${a.employer}`,
        description: null,
        start_at: a.interview_date as string,
        end_at: null,
        location: null,
        meeting_link: null,
        source: 'calendar' as const,
      })),
    ]

    // Sort by start time
    unified.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    setEvents(unified)
    setLoading(false)
  }

  // Group events by date for the calendar grid
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedEvent[]>()
    for (const ev of events) {
      const d = new Date(ev.start_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  // Calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month padding
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true })
    }
    // Next month padding to fill the grid (6 rows = 42 cells)
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
    }
    return days
  }, [currentMonth])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events.filter((e) => new Date(e.start_at) >= now).slice(0, 10)
  }, [events])

  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            All your career events in one place — mock interviews, real interviews, Friday reports, and more.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {showAddModal && profile && (
        <AddCalendarEventModal
          profileId={profile.id}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false)
            loadEvents()
          }}
        />
      )}

      {/* Calendar */}
      <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-neutral-900">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium uppercase tracking-wide text-neutral-400">
              {day}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const key = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
            const dayEvents = eventsByDate.get(key) || []
            const todayHighlight = isToday(day.date)
            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] rounded-lg border p-1.5 sm:min-h-[100px]',
                  day.isCurrentMonth ? 'border-neutral-200 bg-white' : 'border-neutral-100 bg-neutral-50',
                  todayHighlight && 'border-primary-300 bg-primary-50'
                )}
              >
                <div
                  className={cn(
                    'text-xs font-medium',
                    todayHighlight
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white'
                      : day.isCurrentMonth
                        ? 'text-neutral-700'
                        : 'text-neutral-400'
                  )}
                >
                  {day.date.getDate()}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const meta = getEventMeta(ev.event_type)
                    return (
                      <div
                        key={ev.id}
                        className={cn('flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium sm:text-xs', meta.color)}
                        title={ev.title}
                      >
                        <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', meta.dot)} />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <p className="px-1 text-[10px] text-neutral-400">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
          {Object.entries(eventTypeMeta).filter(([k]) => k !== 'default').map(([key, meta]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
              {meta.label}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming events list */}
      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 font-serif text-lg font-semibold text-neutral-900">
          Upcoming Events
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">
              No upcoming events. Your calendar will fill up as your career search progresses.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((ev) => {
              const meta = getEventMeta(ev.event_type)
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', meta.color)}>
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', meta.color)}>
                          {meta.label}
                        </span>
                      </div>
                      <h3 className="mt-2 font-serif text-base font-semibold text-neutral-900">
                        {ev.title}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-600">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(ev.start_at)}
                      </p>
                      {ev.description && (
                        <p className="mt-2 text-sm text-neutral-600">{ev.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {ev.location}
                          </span>
                        )}
                        {ev.meeting_link && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" />
                            <a
                              href={ev.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700"
                            >
                              Join meeting
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </MemberLayout>
  )
}
