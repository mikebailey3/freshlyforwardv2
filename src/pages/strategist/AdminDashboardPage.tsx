import { useEffect, useState } from 'react'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import {
  BarChart3, Users, FileText, Clock, AlertCircle, Building2,
  TrendingUp, Search, CheckCircle2, User, Briefcase, Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { UserRole } from '@/types'

// ============================================================
// Types
// ============================================================

interface StrategistStat {
  strategist_id: string
  full_name: string | null
  application_count: number
  member_count: number
}

interface StatusStat {
  status: string
  count: number
}

interface WorkloadStat {
  strategist_id: string
  full_name: string | null
  member_count: number
  opportunity_count: number
  application_count: number
  follow_up_count: number
}

interface ReviewOpportunity {
  id: string
  employer: string
  job_title: string
  member_name: string | null
  strategist_name: string | null
  created_at: string
}

interface OverdueFollowUp {
  id: string
  title: string
  due_date: string
  member_name: string | null
  strategist_name: string | null
}

interface EmployerStat {
  employer: string
  count: number
}

// ============================================================
// Helpers
// ============================================================

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

const MAX_CAPACITY = 10

// ============================================================
// Component
// ============================================================

export function AdminDashboardPage() {
  const { role } = useAuth()
  const [loading, setLoading] = useState(true)

  const [byStrategist, setByStrategist] = useState<StrategistStat[]>([])
  const [byStatus, setByStatus] = useState<StatusStat[]>([])
  const [workloads, setWorkloads] = useState<WorkloadStat[]>([])
  const [reviewOpps, setReviewOpps] = useState<ReviewOpportunity[]>([])
  const [overdueFollowUps, setOverdueFollowUps] = useState<OverdueFollowUp[]>([])
  const [topEmployers, setTopEmployers] = useState<EmployerStat[]>([])

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)

    // Get all active strategist assignments grouped by strategist
    const { data: allAssignments } = await supabase
      .from('strategist_assignments')
      .select('strategist_id, member_id')
      .eq('is_active', true)

    const assignmentList = (allAssignments ?? []) as { strategist_id: string; member_id: string }[]

    // Build strategist -> member_ids map
    const strategistMemberMap: Record<string, string[]> = {}
    for (const a of assignmentList) {
      if (!strategistMemberMap[a.strategist_id]) strategistMemberMap[a.strategist_id] = []
      strategistMemberMap[a.strategist_id].push(a.member_id)
    }

    const strategistIds = Object.keys(strategistMemberMap)

    // Fetch strategist profile names
    const strategistNames: Record<string, string | null> = {}
    for (const sid of strategistIds) {
      const { data: prof } = await supabase
        .from('member_profiles')
        .select('full_name')
        .eq('user_id', sid)
        .maybeSingle()
      strategistNames[sid] = (prof as { full_name: string | null } | null)?.full_name ?? null
    }

    // All member IDs across all strategists
    const allMemberIds = assignmentList.map((a) => a.member_id)
    const memberIdsSafe = allMemberIds.length > 0 ? allMemberIds : ['00000000-0000-0000-0000-000000000000']

    // Fetch member names for all assigned members
    const memberNames: Record<string, string | null> = {}
    if (allMemberIds.length > 0) {
      const { data: memberProfiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', allMemberIds)
      for (const p of (memberProfiles ?? []) as { user_id: string; full_name: string | null }[]) {
        memberNames[p.user_id] = p.full_name
      }
    }

    // ---- Applications by Strategist + Workload ----
    const strategistStats: StrategistStat[] = []
    const workloadStats: WorkloadStat[] = []

    for (const sid of strategistIds) {
      const mIds = strategistMemberMap[sid]
      const mIdsSafe = mIds.length > 0 ? mIds : ['00000000-0000-0000-0000-000000000000']

      const { count: appCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('member_id', mIdsSafe)

      const { count: oppCount } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .in('member_id', mIdsSafe)

      const { count: fupCount } = await supabase
        .from('follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('strategist_id', sid)
        .eq('status', 'pending')

      strategistStats.push({
        strategist_id: sid,
        full_name: strategistNames[sid],
        application_count: appCount || 0,
        member_count: mIds.length,
      })

      workloadStats.push({
        strategist_id: sid,
        full_name: strategistNames[sid],
        member_count: mIds.length,
        opportunity_count: oppCount || 0,
        application_count: appCount || 0,
        follow_up_count: fupCount || 0,
      })
    }

    setByStrategist(strategistStats)
    setWorkloads(workloadStats)

    // ---- Applications by Status ----
    const { data: allApps } = await supabase
      .from('applications')
      .select('status')
      .in('member_id', memberIdsSafe)

    const statusMap: Record<string, number> = {}
    for (const a of (allApps ?? []) as { status: string }[]) {
      statusMap[a.status] = (statusMap[a.status] || 0) + 1
    }
    const statusList: StatusStat[] = Object.entries(statusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
    setByStatus(statusList)

    // ---- Opportunities Awaiting Review ----
    const { data: reviewData } = await supabase
      .from('opportunities')
      .select('id, employer, job_title, member_id, strategist_id, created_at')
      .in('member_id', memberIdsSafe)
      .in('status', ['needs_review', 'awaiting_member_approval'])
      .order('created_at', { ascending: false })
      .limit(20)

    const reviewOppsList: ReviewOpportunity[] = []
    for (const r of (reviewData ?? []) as {
      id: string; employer: string; job_title: string;
      member_id: string; strategist_id: string | null; created_at: string
    }[]) {
      reviewOppsList.push({
        id: r.id,
        employer: r.employer,
        job_title: r.job_title,
        member_name: memberNames[r.member_id] ?? null,
        strategist_name: r.strategist_id ? (strategistNames[r.strategist_id] ?? null) : null,
        created_at: r.created_at,
      })
    }
    setReviewOpps(reviewOppsList)

    // ---- Overdue Follow-ups ----
    const today = new Date().toISOString()
    const { data: overdueData } = await supabase
      .from('follow_ups')
      .select('id, title, due_date, member_id, strategist_id')
      .lt('due_date', today)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(20)

    const overdueList: OverdueFollowUp[] = []
    for (const f of (overdueData ?? []) as {
      id: string; title: string; due_date: string;
      member_id: string; strategist_id: string | null
    }[]) {
      overdueList.push({
        id: f.id,
        title: f.title,
        due_date: f.due_date,
        member_name: memberNames[f.member_id] ?? null,
        strategist_name: f.strategist_id ? (strategistNames[f.strategist_id] ?? null) : null,
      })
    }
    setOverdueFollowUps(overdueList)

    // ---- Top Employers Applied To ----
    const { data: employerData } = await supabase
      .from('applications')
      .select('employer')
      .in('member_id', memberIdsSafe)

    const employerMap: Record<string, number> = {}
    for (const a of (employerData ?? []) as { employer: string }[]) {
      employerMap[a.employer] = (employerMap[a.employer] || 0) + 1
    }
    const employerList: EmployerStat[] = Object.entries(employerMap)
      .map(([employer, count]) => ({ employer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    setTopEmployers(employerList)

    setLoading(false)
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin={true}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  const totalApps = byStatus.reduce((sum, s) => sum + s.count, 0)
  const maxStrategistApps = Math.max(...byStrategist.map((s) => s.application_count), 1)
  const maxEmployerCount = Math.max(...topEmployers.map((e) => e.count), 1)

  return (
    <StrategistLayout isAdmin={true}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Admin Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Platform-wide analytics across all strategists and members.
        </p>
        <Link to="/master-admin/feature-entitlements" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
          <Settings className="h-4 w-4" />
          Manage Feature Entitlements
        </Link>
      </div>

      {/* Summary stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Users} label="Active Strategists" value={byStrategist.length} color="primary" />
        <SummaryCard icon={FileText} label="Total Applications" value={totalApps} color="accent" />
        <SummaryCard icon={Search} label="Awaiting Review" value={reviewOpps.length} color="warning" />
        <SummaryCard icon={AlertCircle} label="Overdue Follow-ups" value={overdueFollowUps.length} color="error" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Applications by Strategist */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Applications by Strategist</h2>
              <p className="text-xs text-neutral-500">Workload distribution</p>
            </div>
          </div>
          {byStrategist.length === 0 ? (
            <p className="text-sm text-neutral-500">No strategist data available.</p>
          ) : (
            <div className="space-y-3">
              {byStrategist.map((s) => (
                <div key={s.strategist_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-900">{s.full_name || 'Unknown Strategist'}</span>
                    <span className="text-neutral-500">{s.application_count} apps · {s.member_count} members</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${(s.application_count / maxStrategistApps) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications by Status */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <BarChart3 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Applications by Status</h2>
              <p className="text-xs text-neutral-500">Pipeline distribution</p>
            </div>
          </div>
          {byStatus.length === 0 ? (
            <p className="text-sm text-neutral-500">No application data available.</p>
          ) : (
            <div className="space-y-2">
              {byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[s.status] || 'bg-neutral-100 text-neutral-700')}>
                    {STATUS_LABELS[s.status] || s.status}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Member Workload */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Briefcase className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Member Workload</h2>
              <p className="text-xs text-neutral-500">Per-strategist breakdown</p>
            </div>
          </div>
          {workloads.length === 0 ? (
            <p className="text-sm text-neutral-500">No workload data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="pb-2 font-medium">Strategist</th>
                    <th className="pb-2 text-center font-medium">Members</th>
                    <th className="pb-2 text-center font-medium">Opps</th>
                    <th className="pb-2 text-center font-medium">Apps</th>
                    <th className="pb-2 text-center font-medium">F/U</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map((w) => (
                    <tr key={w.strategist_id} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2.5 font-medium text-neutral-900">{w.full_name || 'Unknown'}</td>
                      <td className="py-2.5 text-center text-neutral-600">{w.member_count}</td>
                      <td className="py-2.5 text-center text-neutral-600">{w.opportunity_count}</td>
                      <td className="py-2.5 text-center text-neutral-600">{w.application_count}</td>
                      <td className="py-2.5 text-center text-neutral-600">{w.follow_up_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Strategist Capacity */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <TrendingUp className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Strategist Capacity</h2>
              <p className="text-xs text-neutral-500">Members per strategist (max {MAX_CAPACITY})</p>
            </div>
          </div>
          {workloads.length === 0 ? (
            <p className="text-sm text-neutral-500">No capacity data available.</p>
          ) : (
            <div className="space-y-3">
              {workloads.map((w) => {
                const pct = Math.min((w.member_count / MAX_CAPACITY) * 100, 100)
                const isOverCapacity = w.member_count > MAX_CAPACITY
                const isNearCapacity = w.member_count >= MAX_CAPACITY * 0.8 && !isOverCapacity
                return (
                  <div key={w.strategist_id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-neutral-900">{w.full_name || 'Unknown'}</span>
                      <span className={cn(
                        'text-xs font-semibold',
                        isOverCapacity ? 'text-error-600' : isNearCapacity ? 'text-warning-600' : 'text-neutral-500',
                      )}>
                        {w.member_count}/{MAX_CAPACITY}
                        {isOverCapacity && ' (over capacity)'}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          isOverCapacity ? 'bg-error-500' : isNearCapacity ? 'bg-warning-500' : 'bg-success-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Opportunities Awaiting Review */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100">
              <Search className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Opportunities Awaiting Review</h2>
              <p className="text-xs text-neutral-500">{reviewOpps.length} pending review</p>
            </div>
          </div>
          {reviewOpps.length === 0 ? (
            <p className="text-sm text-neutral-500">No opportunities awaiting review.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {reviewOpps.map((o) => (
                <div key={o.id} className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-sm font-medium text-neutral-900">{o.job_title}</p>
                  <p className="text-xs text-primary-600">{o.employer}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {o.member_name || 'Unknown'}
                    </span>
                    {o.strategist_name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {o.strategist_name}
                      </span>
                    )}
                    <span className="ml-auto">{formatDate(o.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Follow-ups */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-100">
              <Clock className="h-5 w-5 text-error-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Overdue Follow-ups</h2>
              <p className="text-xs text-neutral-500">{overdueFollowUps.length} overdue</p>
            </div>
          </div>
          {overdueFollowUps.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-success-50 p-3 text-sm text-success-700">
              <CheckCircle2 className="h-4 w-4" />
              All follow-ups are on track.
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {overdueFollowUps.map((f) => (
                <div key={f.id} className="rounded-lg border border-error-200 bg-error-50 p-3">
                  <p className="text-sm font-medium text-neutral-900">{f.title}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-500">
                    {f.member_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {f.member_name}
                      </span>
                    )}
                    {f.strategist_name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {f.strategist_name}
                      </span>
                    )}
                    <span className="ml-auto font-medium text-error-600">Due: {formatDate(f.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Employers Applied To */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Building2 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Top Employers Applied To</h2>
              <p className="text-xs text-neutral-500">Most frequently targeted companies</p>
            </div>
          </div>
          {topEmployers.length === 0 ? (
            <p className="text-sm text-neutral-500">No employer data available yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {topEmployers.map((e, idx) => (
                <div key={e.employer} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{e.employer}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${(e.count / maxEmployerCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-sm font-semibold text-neutral-900">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StrategistLayout>
  )
}

// ============================================================
// Sub-components
// ============================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof User
  label: string
  value: number
  color: string
}) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-600',
    warning: 'bg-warning-100 text-warning-600',
    accent: 'bg-accent-100 text-accent-600',
    success: 'bg-success-100 text-success-600',
    error: 'bg-error-100 text-error-600',
  }
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-serif font-bold text-neutral-900">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
