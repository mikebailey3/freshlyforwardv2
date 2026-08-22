import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getFollowUps, getAssignedMembers } from '@/lib/operations'
import { timeAgo, formatDate } from '@/lib/utils'
import {
  Users, Search, FileText, MessageSquare, Calendar, Clock,
  CheckCircle2, AlertCircle, TrendingUp, Activity, User, Plus,
} from 'lucide-react'
import type { FollowUp, MemberProfile } from '@/types'

interface MemberWithProfile {
  member_id: string
  assigned_at: string
  profile: MemberProfile | null
  unread_count: number
  pending_approvals: number
}

export function StrategistDashboardPage() {
  const { user, role } = useAuth()
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [stats, setStats] = useState({
    researching: 0,
    awaitingApproval: 0,
    readyToSubmit: 0,
    submitted: 0,
    interviews: 0,
    followUpsDue: 0,
    overdue: 0,
    unreadMessages: 0,
    newQuestionnaires: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    const assignments = await getAssignedMembers(user.id)
    const memberIds = assignments.map((a) => a.member_id)

    const memberData: MemberWithProfile[] = []
    for (const assignment of assignments) {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('user_id', assignment.member_id)
        .maybeSingle()

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', assignment.member_id)
        .eq('sender_type', 'member')
        .eq('is_read', false)

      const { count: pending } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', assignment.member_id)
        .eq('status', 'awaiting_member_approval')

      memberData.push({
        member_id: assignment.member_id,
        assigned_at: assignment.assigned_at,
        profile: profile as MemberProfile | null,
        unread_count: unread || 0,
        pending_approvals: pending || 0,
      })
    }
    setMembers(memberData)

    const fups = await getFollowUps(user.id)
    setFollowUps(fups)

    // Aggregate stats
    const { count: researching } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'researching')

    const { count: awaiting } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'awaiting_member_approval')

    const { count: ready } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'ready_to_submit')

    const { count: submitted } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'submitted')

    const { count: interviews } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'interview_scheduled')

    const today = new Date()
    const overdueCount = fups.filter((f) => f.status === 'pending' && new Date(f.due_date) < today).length
    const dueThisWeek = fups.filter((f) => {
      if (f.status !== 'pending') return false
      const due = new Date(f.due_date)
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      return due >= today && due <= weekFromNow
    }).length

    setStats({
      researching: researching || 0,
      awaitingApproval: awaiting || 0,
      readyToSubmit: ready || 0,
      submitted: submitted || 0,
      interviews: interviews || 0,
      followUpsDue: dueThisWeek,
      overdue: overdueCount,
      unreadMessages: memberData.reduce((sum, m) => sum + m.unread_count, 0),
      newQuestionnaires: memberData.filter((m) => m.profile?.onboarding_completed && !m.profile?.search_readiness_score).length,
    })

    setLoading(false)
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

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const overdueFollowUps = followUps.filter((f) => f.status === 'pending' && new Date(f.due_date) < today)
  const tomorrowFollowUps = followUps.filter((f) => f.status === 'pending' && new Date(f.due_date) >= today && new Date(f.due_date) < tomorrow)
  const thisWeekFollowUps = followUps.filter((f) => f.status === 'pending' && new Date(f.due_date) >= tomorrow && new Date(f.due_date) <= weekFromNow)
  const completedFollowUps = followUps.filter((f) => f.status === 'completed')

  return (
    <StrategistLayout isAdmin={role === 'admin'}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Strategist Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">Your operational overview for {members.length} assigned member{members.length !== 1 ? 's' : ''}.</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Search} label="Under Research" value={stats.researching} color="primary" />
        <StatCard icon={AlertCircle} label="Awaiting Approval" value={stats.awaitingApproval} color="warning" />
        <StatCard icon={FileText} label="Ready to Submit" value={stats.readyToSubmit} color="accent" />
        <StatCard icon={CheckCircle2} label="Submitted" value={stats.submitted} color="success" />
        <StatCard icon={Calendar} label="Interviews" value={stats.interviews} color="primary" />
        <StatCard icon={MessageSquare} label="Unread Messages" value={stats.unreadMessages} color="warning" />
        <StatCard icon={Clock} label="Follow-ups Due" value={stats.followUpsDue} color="accent" />
        <StatCard icon={AlertCircle} label="Overdue" value={stats.overdue} color="error" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Members awaiting review */}
        <div className="lg:col-span-2 space-y-6">
          {/* Members */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-neutral-900">Assigned Members</h3>
                  <p className="text-xs text-neutral-500">{members.length} active</p>
                </div>
              </div>
              <Link to="/strategist/members" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-neutral-500">No members assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {members.slice(0, 5).map((m) => (
                  <Link
                    key={m.member_id}
                    to={`/strategist/members/${m.member_id}`}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 transition-all hover:border-primary-300 hover:bg-primary-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                      <User className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{m.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-neutral-500">{m.profile?.headline || 'No headline set'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.pending_approvals > 0 && (
                        <span className="rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700">
                          {m.pending_approvals} pending
                        </span>
                      )}
                      {m.unread_count > 0 && (
                        <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {m.unread_count}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Follow-ups */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <Clock className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-neutral-900">Follow-Ups</h3>
                <p className="text-xs text-neutral-500">Scheduled reminders</p>
              </div>
            </div>

            {followUps.length === 0 ? (
              <p className="text-sm text-neutral-500">No follow-ups scheduled.</p>
            ) : (
              <div className="space-y-3">
                {overdueFollowUps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-error-600">Overdue</p>
                    {overdueFollowUps.map((f) => <FollowUpCard key={f.id} followUp={f} overdue />)}
                  </div>
                )}
                {tomorrowFollowUps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-warning-600">Tomorrow</p>
                    {tomorrowFollowUps.map((f) => <FollowUpCard key={f.id} followUp={f} />)}
                  </div>
                )}
                {thisWeekFollowUps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary-600">This Week</p>
                    {thisWeekFollowUps.map((f) => <FollowUpCard key={f.id} followUp={f} />)}
                  </div>
                )}
                {completedFollowUps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-success-600">Completed</p>
                    {completedFollowUps.slice(0, 3).map((f) => <FollowUpCard key={f.id} followUp={f} completed />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick actions + capacity */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <Activity className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-neutral-900">Quick Actions</h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                to="/strategist/opportunities"
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Plus className="h-4 w-4 text-primary-600" />
                Add Opportunity
              </Link>
              <Link
                to="/strategist/applications"
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <FileText className="h-4 w-4 text-primary-600" />
                View Applications
              </Link>
              <Link
                to="/strategist/members"
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Users className="h-4 w-4 text-primary-600" />
                Review Members
              </Link>
            </div>
          </div>

          {/* Strategist Capacity */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <TrendingUp className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-neutral-900">Capacity</h3>
                <p className="text-xs text-neutral-500">Active workload</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Assigned Members</span>
                <span className="font-semibold text-neutral-900">{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Active Opportunities</span>
                <span className="font-semibold text-neutral-900">{stats.researching + stats.awaitingApproval}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Pending Applications</span>
                <span className="font-semibold text-neutral-900">{stats.readyToSubmit + stats.submitted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Open Follow-ups</span>
                <span className="font-semibold text-neutral-900">{followUps.filter((f) => f.status === 'pending').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StrategistLayout>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof User; label: string; value: number; color: string }) {
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
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}>
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

function FollowUpCard({ followUp, overdue, completed }: { followUp: FollowUp; overdue?: boolean; completed?: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${
      overdue ? 'border-error-200 bg-error-50' : completed ? 'border-success-200 bg-success-50' : 'border-neutral-200 bg-neutral-50'
    }`}>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-900">{followUp.title}</p>
        {followUp.description && <p className="text-xs text-neutral-600">{followUp.description}</p>}
        <p className="mt-1 text-xs text-neutral-400">Due: {formatDate(followUp.due_date)}</p>
      </div>
    </div>
  )
}
