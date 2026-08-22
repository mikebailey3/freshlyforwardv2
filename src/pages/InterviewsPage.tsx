import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Briefcase, Calendar, Loader2, MapPin, ArrowRight, Video, Plus, Pencil, Check, X } from 'lucide-react'
import type { Application } from '@/types'

const INTERVIEW_STATUSES = ['interview_requested', 'interview_scheduled']
const TERMINAL_STATUSES = ['rejected', 'closed']

export function InterviewsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadApplications = () => {
    if (!user) return
    supabase
      .from('applications')
      .select('*')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) console.error('Error loading applications:', fetchError)
        setApplications((data as Application[]) || [])
        setLoading(false)
      })
  }

  useEffect(loadApplications, [user])

  const handleSetDate = async (applicationId: string, isoDate: string) => {
    setSavingId(applicationId)
    setError(null)
    const { error: rpcError } = await supabase.rpc('set_application_interview_date', {
      p_application_id: applicationId,
      p_interview_date: isoDate,
    })
    if (rpcError) {
      console.error('Error setting interview date:', rpcError)
      setError('Could not save that interview date. Please try again.')
      setSavingId(null)
      return
    }
    setEditingId(null)
    setSavingId(null)
    loadApplications()
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

  const now = new Date()
  const withDate = applications.filter((a) => a.interview_date)
  const upcoming = withDate.filter((a) => new Date(a.interview_date!) >= now)
  const past = withDate.filter((a) => new Date(a.interview_date!) < now)
  const needsDate = applications.filter(
    (a) => !a.interview_date && !TERMINAL_STATUSES.includes(a.status)
  )

  return (
    <MemberLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Interviews</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Real employer interviews from your applications. Got a date from an employer? Add it here so
            your strategist knows right away. Practicing? Head to Mock Interviews.
          </p>
        </div>
        <Link
          to="/mock-interviews"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Video className="h-4 w-4" />
          Mock Interviews
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700">
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            No applications yet. Interviews will show up here once your strategist starts applying on your behalf.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-serif text-lg font-semibold text-neutral-900">Upcoming</h2>
              {upcoming.map((app) => (
                <InterviewCard
                  key={app.id}
                  app={app}
                  editing={editingId === app.id}
                  saving={savingId === app.id}
                  onEdit={() => setEditingId(app.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(iso) => handleSetDate(app.id, iso)}
                />
              ))}
            </div>
          )}

          {needsDate.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-serif text-lg font-semibold text-neutral-900">Awaiting an Interview Date</h2>
              <p className="text-sm text-neutral-500">
                Heard back from an employer? Add the date so it lands on your strategist's radar.
              </p>
              {needsDate.map((app) => (
                <InterviewCard
                  key={app.id}
                  app={app}
                  editing={editingId === app.id}
                  saving={savingId === app.id}
                  onEdit={() => setEditingId(app.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(iso) => handleSetDate(app.id, iso)}
                />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-serif text-lg font-semibold text-neutral-900">Past</h2>
              {past.map((app) => (
                <InterviewCard
                  key={app.id}
                  app={app}
                  editing={editingId === app.id}
                  saving={savingId === app.id}
                  onEdit={() => setEditingId(app.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(iso) => handleSetDate(app.id, iso)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </MemberLayout>
  )
}

interface InterviewCardProps {
  app: Application
  editing: boolean
  saving: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (isoDate: string) => void
}

function InterviewCard({ app, editing, saving, onEdit, onCancelEdit, onSave }: InterviewCardProps) {
  const isActive = INTERVIEW_STATUSES.includes(app.status)
  const [localValue, setLocalValue] = useState(
    app.interview_date ? new Date(app.interview_date).toISOString().slice(0, 16) : ''
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!localValue) return
    onSave(new Date(localValue).toISOString())
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isActive && (
            <span className="rounded-full bg-primary-600 px-3 py-1 text-xs font-medium text-white">
              Interview Scheduled
            </span>
          )}
          <h3 className="mt-3 font-serif text-lg font-semibold text-neutral-900">{app.job_title}</h3>
          <p className="flex items-center gap-1 text-sm text-neutral-600">
            <MapPin className="h-3.5 w-3.5" />
            {app.employer}
          </p>

          {editing ? (
            <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                required
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={saving || !localValue}
                className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </form>
          ) : (
            <>
              {app.interview_date ? (
                <button
                  onClick={onEdit}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-primary-700"
                >
                  <Calendar className="h-4 w-4 text-primary-600" />
                  {new Date(app.interview_date).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                  <Pencil className="h-3 w-3 text-neutral-400" />
                </button>
              ) : (
                <button
                  onClick={onEdit}
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-primary-300 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Interview Date
                </button>
              )}
            </>
          )}

          {app.date_submitted && (
            <p className="mt-2 text-xs text-neutral-400">Applied {formatDate(app.date_submitted)}</p>
          )}
        </div>
        <Link
          to={`/why-we-applied/${app.id}`}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
        >
          Prep Notes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
