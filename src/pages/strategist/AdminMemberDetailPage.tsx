import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StrategistLayout } from '@/components/StrategistLayout'
import { ProfileEditForm } from '@/components/ProfileEditForm'
import { supabase } from '@/lib/supabase'
import { calculateSearchReadiness } from '@/lib/profile'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft, Loader2, AlertCircle, ShieldAlert, ShieldCheck, ShieldX,
  CreditCard, Check,
} from 'lucide-react'
import type { AdminMemberSummary, MemberProfile, MembershipPlan } from '@/types'

const ACCOUNT_STATUSES = ['active', 'suspended', 'banned'] as const
const SUBSCRIPTION_STATUSES = ['none', 'trialing', 'active', 'past_due', 'paused', 'canceled']

export function AdminMemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<AdminMemberSummary | null>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [statusForm, setStatusForm] = useState<{ status: 'active' | 'suspended' | 'banned'; reason: string }>({
    status: 'active',
    reason: '',
  })
  const [subForm, setSubForm] = useState<{ plan_id: string; subscription_status: string }>({
    plan_id: '',
    subscription_status: 'none',
  })
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingSub, setSavingSub] = useState(false)

  useEffect(() => {
    if (!memberId) return
    loadAll(memberId)
  }, [memberId])

  const loadAll = async (id: string) => {
    setLoading(true)
    setError(null)

    const [{ data: members, error: listErr }, { data: profileData, error: profileErr }, { data: planData }] =
      await Promise.all([
        supabase.rpc('admin_list_members'),
        supabase.from('member_profiles').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('membership_plans').select('*').order('sort_order', { ascending: true }),
      ])

    if (listErr || profileErr || !profileData) {
      setError(listErr?.message || profileErr?.message || 'Member not found.')
      setLoading(false)
      return
    }

    const found = ((members as AdminMemberSummary[]) || []).find((m) => m.user_id === id) || null
    setSummary(found)
    setProfile(profileData as MemberProfile)
    setPlans((planData as MembershipPlan[]) || [])
    setStatusForm({
      status: (profileData as MemberProfile).account_status || 'active',
      reason: (profileData as MemberProfile).account_status_reason || '',
    })
    setSubForm({
      plan_id: (profileData as MemberProfile).plan_id || '',
      subscription_status: (profileData as MemberProfile).subscription_status || 'none',
    })
    setLoading(false)
  }

  const handleSaveProfile = async (updates: Record<string, unknown>) => {
    if (!memberId || !profile) return
    const merged = { ...profile, ...updates } as MemberProfile
    const { score } = calculateSearchReadiness(merged)
    const { error } = await supabase
      .from('member_profiles')
      .update({ ...updates, search_readiness_score: score })
      .eq('user_id', memberId)
    if (error) throw new Error(error.message)
    await loadAll(memberId)
    setSuccessMsg('Profile updated.')
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleSaveStatus = async () => {
    if (!memberId) return
    setSavingStatus(true)
    setError(null)
    const { error } = await supabase
      .from('member_profiles')
      .update({
        account_status: statusForm.status,
        account_status_reason: statusForm.status === 'active' ? null : statusForm.reason || null,
        account_status_changed_at: new Date().toISOString(),
      })
      .eq('user_id', memberId)
    if (error) {
      setError(error.message)
    } else {
      await loadAll(memberId)
      setSuccessMsg('Account status updated.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
    setSavingStatus(false)
  }

  const handleSaveSubscription = async () => {
    if (!memberId) return
    setSavingSub(true)
    setError(null)
    const { error } = await supabase
      .from('member_profiles')
      .update({
        plan_id: subForm.plan_id || null,
        subscription_status: subForm.subscription_status,
      })
      .eq('user_id', memberId)
    if (error) {
      setError(error.message)
    } else {
      await loadAll(memberId)
      setSuccessMsg('Subscription updated.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
    setSavingSub(false)
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

  if (!profile) {
    return (
      <StrategistLayout isAdmin>
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">{error || 'Member not found.'}</p>
          <button onClick={() => navigate('/admin/members')} className="mt-4 text-sm font-medium text-primary-600 hover:underline">
            Back to Members
          </button>
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin>
      <Link to="/admin/members" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Members
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          {profile.full_name || 'Unnamed Member'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{summary?.email}</p>
        <p className="mt-1 text-xs text-neutral-400">Joined {formatDate(profile.created_at)}</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-success-50 border border-success-100 px-4 py-3 text-sm text-success-700">
          <Check className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Account Status */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100">
              <ShieldAlert className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Account Status</h2>
              <p className="text-xs text-neutral-500">Suspend or ban to restrict platform access</p>
            </div>
          </div>

          <label className="block text-sm font-medium text-neutral-700">Status</label>
          <select
            value={statusForm.status}
            onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value as typeof prev.status }))}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm capitalize shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {statusForm.status !== 'active' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700">Reason</label>
              <textarea
                value={statusForm.reason}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={3}
                placeholder="Why is this account being restricted?"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}

          <button
            onClick={handleSaveStatus}
            disabled={savingStatus}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : statusForm.status === 'active' ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
            Update Status
          </button>
        </div>

        {/* Subscription */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <CreditCard className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-900">Subscription</h2>
              <p className="text-xs text-neutral-500">Change plan or billing status manually</p>
            </div>
          </div>

          <label className="block text-sm font-medium text-neutral-700">Plan</label>
          <select
            value={subForm.plan_id}
            onChange={(e) => setSubForm((prev) => ({ ...prev, plan_id: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">No plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({formatCurrency(plan.price_cents)}/{plan.interval})
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm font-medium text-neutral-700">Subscription Status</label>
          <select
            value={subForm.subscription_status}
            onChange={(e) => setSubForm((prev) => ({ ...prev, subscription_status: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm capitalize shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={handleSaveSubscription}
            disabled={savingSub}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {savingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Update Subscription
          </button>
        </div>
      </div>

      {/* Profile Editor */}
      <div className="mb-4">
        <h2 className="font-serif text-lg font-semibold text-neutral-900">Career Profile</h2>
        <p className="text-sm text-neutral-600">Edit this member&rsquo;s career profile directly.</p>
      </div>
      <ProfileEditForm profile={profile} onSave={handleSaveProfile} onCancel={() => navigate('/admin/members')} />
    </StrategistLayout>
  )
}
