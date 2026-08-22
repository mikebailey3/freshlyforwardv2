import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StrategistLayout } from '@/components/StrategistLayout'
import { supabase } from '@/lib/supabase'
import { adminAssignStrategist, getEligibleStrategists } from '@/lib/operations'
import { cn, formatDate } from '@/lib/utils'
import {
  Users, Search, Filter, ShieldAlert, ShieldCheck, ShieldX, ArrowRight,
  AlertCircle, Loader2, UserCog,
} from 'lucide-react'
import type { AdminMemberSummary, EligibleStrategist } from '@/types'

type StatusFilter = 'all' | 'active' | 'suspended' | 'banned'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success-100 text-success-700',
  suspended: 'bg-warning-100 text-warning-700',
  banned: 'bg-error-100 text-error-700',
}

export function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMemberSummary[]>([])
  const [strategists, setStrategists] = useState<EligibleStrategist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    loadMembers()
    loadStrategists()
  }, [])

  const loadStrategists = async () => {
    setStrategists(await getEligibleStrategists())
  }

  const loadMembers = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('admin_list_members')
    if (error) {
      setError(error.message)
    } else {
      setMembers((data as AdminMemberSummary[]) || [])
    }
    setLoading(false)
  }

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false
      if (statusFilter === 'all') return true
      return m.account_status === statusFilter
    })
  }, [members, searchQuery, statusFilter])

  const setAccountStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    let reason: string | null = null
    if (status !== 'active') {
      reason = window.prompt(`Reason for ${status === 'banned' ? 'banning' : 'suspending'} this member (optional):`) || null
    }
    setActioningId(userId)
    const { error } = await supabase
      .from('member_profiles')
      .update({
        account_status: status,
        account_status_reason: reason,
        account_status_changed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, account_status: status, account_status_reason: reason } : m)),
      )
    } else {
      setError(error.message)
    }
    setActioningId(null)
  }

  const toggleStrategistStatus = async (userId: string, current: boolean) => {
    setActioningId(userId)
    const { error } = await supabase
      .from('member_profiles')
      .update({ is_strategist: !current })
      .eq('user_id', userId)
    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, is_strategist: !current } : m)),
      )
    } else {
      setError(error.message)
    }
    setActioningId(null)
  }

  const handleAssignStrategist = async (memberId: string, strategistId: string) => {
    if (!strategistId) return
    setActioningId(memberId)
    const assignError = await adminAssignStrategist(memberId, strategistId)
    if (assignError) {
      setError(assignError)
    } else {
      const strategist = strategists.find((s) => s.user_id === strategistId)
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === memberId
            ? { ...m, strategist_id: strategistId, strategist_name: strategist?.full_name || strategist?.email || 'Strategist' }
            : m,
        ),
      )
    }
    setActioningId(null)
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Members</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage every member on the platform &mdash; profiles, subscriptions, and account access.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & filter bar */}
      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              aria-label="Search members by name or email"
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by account status"
              className="rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-8 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members list */}
      {filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            {members.length === 0 ? 'No members yet.' : 'No members match your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((m) => (
            <div
              key={m.user_id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-primary-200"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-base font-semibold text-neutral-900 truncate">
                      {m.full_name || 'Unnamed Member'}
                    </h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_BADGE[m.account_status])}>
                      {m.account_status}
                    </span>
                    {m.onboarding_completed && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                        Onboarded
                      </span>
                    )}
                    {m.is_strategist && (
                      <span className="flex items-center gap-1 rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700">
                        <UserCog className="h-3 w-3" />
                        Strategist
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-500 truncate">{m.email}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {m.plan_name || 'No plan'} &middot; {m.subscription_status} &middot; joined {formatDate(m.created_at)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <UserCog className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-500">
                      {m.strategist_name ? (
                        <>Strategist: <span className="font-medium text-neutral-700">{m.strategist_name}</span></>
                      ) : (
                        <span className="text-warning-600">No strategist assigned</span>
                      )}
                    </span>
                    <select
                      value=""
                      onChange={(e) => handleAssignStrategist(m.user_id, e.target.value)}
                      disabled={actioningId === m.user_id || strategists.length === 0}
                      aria-label={`Assign strategist to ${m.full_name || 'member'}`}
                      className="rounded-lg border border-neutral-300 bg-white py-1 pl-2 pr-6 text-xs text-neutral-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {m.strategist_name ? 'Reassign to...' : 'Assign to...'}
                      </option>
                      {strategists.map((s) => (
                        <option key={s.user_id} value={s.user_id} disabled={s.user_id === m.strategist_id}>
                          {s.full_name || s.email} ({s.active_member_count}){s.is_admin ? ' — admin' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStrategistStatus(m.user_id, m.is_strategist)}
                    disabled={actioningId === m.user_id}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60',
                      m.is_strategist
                        ? 'border-secondary-200 bg-secondary-50 text-secondary-700 hover:bg-secondary-100'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100',
                    )}
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    {m.is_strategist ? 'Revoke Strategist' : 'Make Strategist'}
                  </button>
                  {m.account_status !== 'active' && (
                    <button
                      onClick={() => setAccountStatus(m.user_id, 'active')}
                      disabled={actioningId === m.user_id}
                      className="flex items-center gap-1.5 rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-xs font-medium text-success-700 transition-colors hover:bg-success-100 disabled:opacity-60"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Reactivate
                    </button>
                  )}
                  {m.account_status !== 'suspended' && (
                    <button
                      onClick={() => setAccountStatus(m.user_id, 'suspended')}
                      disabled={actioningId === m.user_id}
                      className="flex items-center gap-1.5 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs font-medium text-warning-700 transition-colors hover:bg-warning-100 disabled:opacity-60"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Suspend
                    </button>
                  )}
                  {m.account_status !== 'banned' && (
                    <button
                      onClick={() => setAccountStatus(m.user_id, 'banned')}
                      disabled={actioningId === m.user_id}
                      className="flex items-center gap-1.5 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs font-medium text-error-600 transition-colors hover:bg-error-100 disabled:opacity-60"
                    >
                      <ShieldX className="h-3.5 w-3.5" />
                      Ban
                    </button>
                  )}
                  <Link
                    to={`/admin/members/${m.user_id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
                  >
                    Manage
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StrategistLayout>
  )
}
