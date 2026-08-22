import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { createCalendarEvent } from '@/lib/communication'
import { cn } from '@/lib/utils'
import { Loader2, X, Calendar, Briefcase } from 'lucide-react'
import type { Application } from '@/types'

const CUSTOM_EVENT_TYPES = [
  { value: 'strategist_meeting', label: 'Meeting with Strategist' },
  { value: 'reminder', label: 'Personal Reminder' },
  { value: 'career_review', label: 'Career Review Session' },
  { value: 'default', label: 'Other' },
] as const

const TERMINAL_STATUSES = ['rejected', 'closed']

interface AddCalendarEventModalProps {
  profileId: string
  onClose: () => void
  onCreated: () => void
}

type Mode = 'custom' | 'interview'

export function AddCalendarEventModal({ profileId, onClose, onCreated }: AddCalendarEventModalProps) {
  const [mode, setMode] = useState<Mode>('custom')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Custom event fields
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<string>('reminder')
  const [startAt, setStartAt] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')

  // Interview date fields
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [interviewAt, setInterviewAt] = useState('')
  const [loadingApps, setLoadingApps] = useState(false)

  useEffect(() => {
    if (mode !== 'interview') return
    setLoadingApps(true)
    supabase
      .from('applications')
      .select('*')
      .eq('member_id', profileId)
      .is('interview_date', null)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error('Error loading applications:', fetchError)
        setApplications(((data as Application[]) || []).filter((a) => !TERMINAL_STATUSES.includes(a.status)))
        setLoadingApps(false)
      })
  }, [mode, profileId])

  const handleCustomSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title || !startAt) return
    setSaving(true)
    setError(null)
    const result = await createCalendarEvent({
      user_id: profileId,
      event_type: eventType,
      title,
      description: description || null,
      start_at: new Date(startAt).toISOString(),
      location: location || null,
      meeting_link: meetingLink || null,
    })
    setSaving(false)
    if (!result) {
      setError('Could not create that event. Please try again.')
      return
    }
    onCreated()
  }

  const handleInterviewSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedAppId || !interviewAt) return
    setSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('set_application_interview_date', {
      p_application_id: selectedAppId,
      p_interview_date: new Date(interviewAt).toISOString(),
    })
    setSaving(false)
    if (rpcError) {
      console.error('Error setting interview date:', rpcError)
      setError('Could not save that interview date. Please try again.')
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-neutral-900">Add to Calendar</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="mb-5 flex gap-2 rounded-xl bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
              mode === 'custom' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <Calendar className="h-4 w-4" />
            Custom Event
          </button>
          <button
            type="button"
            onClick={() => setMode('interview')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
              mode === 'interview' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <Briefcase className="h-4 w-4" />
            Interview Date
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700">
            {error}
          </div>
        )}

        {mode === 'custom' ? (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label htmlFor="ev-title" className="block text-sm font-medium text-neutral-700">Title</label>
              <input
                id="ev-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Call with strategist about resume"
                className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-type" className="block text-sm font-medium text-neutral-700">Type</label>
                <select
                  id="ev-type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {CUSTOM_EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ev-start" className="block text-sm font-medium text-neutral-700">Date &amp; Time</label>
                <input
                  id="ev-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ev-desc" className="block text-sm font-medium text-neutral-700">
                Description <span className="text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="ev-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ev-loc" className="block text-sm font-medium text-neutral-700">
                  Location <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="ev-loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="ev-link" className="block text-sm font-medium text-neutral-700">
                  Meeting Link <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="ev-link"
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://teams.microsoft.com/..."
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <ModalActions saving={saving} disabled={!title || !startAt} onClose={onClose} />
          </form>
        ) : (
          <form onSubmit={handleInterviewSubmit} className="space-y-4">
            {loadingApps ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              </div>
            ) : applications.length === 0 ? (
              <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
                No applications are currently missing an interview date. Once your strategist submits one for you
                (or if you already have a date), you can add it from the Interviews page.
              </p>
            ) : (
              <>
                <div>
                  <label htmlFor="ev-app" className="block text-sm font-medium text-neutral-700">Application</label>
                  <select
                    id="ev-app"
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select an application…</option>
                    {applications.map((a) => (
                      <option key={a.id} value={a.id}>{a.job_title} — {a.employer}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ev-int-date" className="block text-sm font-medium text-neutral-700">Interview Date &amp; Time</label>
                  <input
                    id="ev-int-date"
                    type="datetime-local"
                    value={interviewAt}
                    onChange={(e) => setInterviewAt(e.target.value)}
                    required
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <p className="text-xs text-neutral-500">
                  This will notify your strategist right away so they can help you prep.
                </p>
                <ModalActions saving={saving} disabled={!selectedAppId || !interviewAt} onClose={onClose} />
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

function ModalActions({ saving, disabled, onClose }: { saving: boolean; disabled: boolean; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={saving || disabled}
        className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
      >
        Cancel
      </button>
    </div>
  )
}
