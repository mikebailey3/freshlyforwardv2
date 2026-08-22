import { useEffect, useMemo, useState } from 'react'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAssignedMembers, updateApplication } from '@/lib/operations'
import { cn, formatDate, timeAgo } from '@/lib/utils'
import {
  FileText, Search, User, Calendar, Clock, ChevronDown,
  MapPin, Briefcase,
} from 'lucide-react'
import type { Application, MemberProfile } from '@/types'
import { APPLICATION_STATUSES } from '@/types'

type StatusFilter = 'all' | (typeof APPLICATION_STATUSES)[number]

const STATUS_COLORS: Record<string, string> = {
  preparing_resume: 'bg-neutral-100 text-neutral-700',
  preparing_cover_letter: 'bg-neutral-100 text-neutral-700',
  waiting_on_member: 'bg-warning-100 text-warning-700',
  ready_to_submit: 'bg-accent-100 text-accent-700',
  submitted: 'bg-primary-100 text-primary-700',
  employer_viewed: 'bg-primary-100 text-primary-700',
  follow_up_needed: 'bg-warning-100 text-warning-700',
  interview_requested: 'bg-accent-100 text-accent-700',
  interview_scheduled: 'bg-primary-100 text-primary-700',
  rejected: 'bg-error-100 text-error-700',
  offer_received: 'bg-success-100 text-success-700',
  offer_accepted: 'bg-success-100 text-success-700',
  closed: 'bg-neutral-100 text-neutral-500',
}

const STATUS_LABELS: Record<string, string> = {
  preparing_resume: 'Preparing Resume',
  preparing_cover_letter: 'Preparing Cover Letter',
  waiting_on_member: 'Waiting on Member',
  ready_to_submit: 'Ready to Submit',
  submitted: 'Submitted',
  employer_viewed: 'Employer Viewed',
  follow_up_needed: 'Follow-up Needed',
  interview_requested: 'Interview Requested',
  interview_scheduled: 'Interview Scheduled',
  rejected: 'Rejected',
  offer_received: 'Offer Received',
  offer_accepted: 'Offer Accepted',
  closed: 'Closed',
}

export function StrategistApplicationsPage() {
  const { user, role } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, MemberProfile | null>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    const assignments = await getAssignedMembers(user.id)
    const memberIds = assignments.map((a) => a.member_id)

    // Load member profiles into map
    const mMap: Record<string, MemberProfile | null> = {}
    for (const a of assignments) {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('user_id', a.member_id)
        .maybeSingle()
      mMap[a.member_id] = profile as MemberProfile | null
    }
    setMemberMap(mMap)

    // Load all applications for assigned members
    if (memberIds.length > 0) {
      const { data: apps } = await supabase
        .from('applications')
        .select('*')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false })
      setApplications((apps ?? []) as Application[])
    }

    setLoading(false)
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      const matchesSearch =
        !searchQuery ||
        a.employer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.job_title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [applications, statusFilter, searchQuery])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1
    }
    return counts
  }, [applications])

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    setUpdatingId(applicationId)
    await updateApplication(applicationId, { status: newStatus })
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)),
    )
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin={role === 'admin'}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin={role === 'admin'}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Applications</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {applications.length} application{applications.length !== 1 ? 's' : ''} across all assigned members.
        </p>
      </div>

      {/* Search & filter */}
      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employer or job title..."
              aria-label="Search applications"
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-neutral-600">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by application status"
              className="rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-8 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Statuses ({applications.length})</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]} ({statusCounts[s] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications list */}
      {filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            {applications.length === 0
              ? 'No applications yet. Applications will appear here once they are created.'
              : 'No applications match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              memberName={memberMap[app.member_id]?.full_name || 'Unknown'}
              updating={updatingId === app.id}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </StrategistLayout>
  )
}

interface ApplicationCardProps {
  application: Application
  memberName: string
  updating: boolean
  onStatusChange: (id: string, status: string) => void
}

function ApplicationCard({ application, memberName, updating, onStatusChange }: ApplicationCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-primary-300">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-sm font-semibold text-neutral-900 truncate">{application.job_title}</h3>
          <p className="text-sm font-medium text-primary-600 truncate">{application.employer}</p>
        </div>
        <span className={cn('flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[application.status] || 'bg-neutral-100 text-neutral-700')}>
          {STATUS_LABELS[application.status] || application.status}
        </span>
      </div>

      {/* Member */}
      <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500">
        <User className="h-3.5 w-3.5" />
        <span className="truncate">{memberName}</span>
      </div>

      {/* Dates */}
      <div className="mb-3 space-y-1.5 text-xs text-neutral-600">
        {application.date_found && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span>Found: {formatDate(application.date_found)}</span>
          </div>
        )}
        {application.date_submitted && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span>Submitted: {formatDate(application.date_submitted)}</span>
          </div>
        )}
        {application.follow_up_date && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-neutral-400" />
            <span>Follow-up: {formatDate(application.follow_up_date)}</span>
          </div>
        )}
        {application.interview_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary-500" />
            <span className="font-medium text-primary-700">Interview: {formatDate(application.interview_date)}</span>
          </div>
        )}
      </div>

      {/* Source */}
      {application.source && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500">
          <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
          <span>Source: {application.source}</span>
        </div>
      )}

      {/* Created date */}
      <p className="mb-3 text-xs text-neutral-400">Created {timeAgo(application.created_at)}</p>

      {/* Status update dropdown */}
      <div className="border-t border-neutral-100 pt-3">
        <label htmlFor={`status-select-${application.id}`} className="sr-only">
          Update application status for {application.job_title} at {application.employer}
        </label>
        <div className="relative">
          <select
            id={`status-select-${application.id}`}
            value={application.status}
            disabled={updating}
            onChange={(e) => onStatusChange(application.id, e.target.value)}
            className="w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          {updating && (
            <div className="absolute right-9 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
