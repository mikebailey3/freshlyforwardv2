import { useEffect, useState } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  CreditCard, Pause, Play, X, Loader2, AlertCircle, Check,
  ExternalLink, Calendar, Shield, Info,
} from 'lucide-react'
import type { MembershipPlan } from '@/types'

export function MembershipPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!user || !profile?.plan_id) {
      setLoading(false)
      return
    }
    supabase
      .from('membership_plans')
      .select('*')
      .eq('id', profile.plan_id)
      .maybeSingle()
      .then(({ data }) => {
        setPlan(data as MembershipPlan | null)
        setLoading(false)
      })
  }, [user, profile])

  const handlePortal = async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Billing portal not available. Stripe may not be configured yet.')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Unexpected response from billing portal.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal.')
      setPortalLoading(false)
    }
  }

  const handlePause = async () => {
    if (!user) return
    setActionLoading(true)
    setError(null)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }

      // Fallback: update status directly
      await supabase
        .from('member_profiles')
        .update({ subscription_status: 'paused' })
        .eq('user_id', user.id)
      await refreshProfile()
    } catch {
      setError('Could not pause membership. Please try again.')
    }
    setActionLoading(false)
  }

  const handleResume = async () => {
    if (!user) return
    setActionLoading(true)
    setError(null)
    try {
      await supabase
        .from('member_profiles')
        .update({ subscription_status: 'active' })
        .eq('user_id', user.id)
      await refreshProfile()
    } catch {
      setError('Could not resume membership.')
    }
    setActionLoading(false)
  }

  const handleCancel = async () => {
    if (!user) return
    if (!confirm('Are you sure you want to cancel your membership? You can rejoin anytime.')) return
    setActionLoading(true)
    setError(null)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }

      // Fallback
      await supabase
        .from('member_profiles')
        .update({ subscription_status: 'canceled' })
        .eq('user_id', user.id)
      await refreshProfile()
    } catch {
      setError('Could not cancel membership.')
    }
    setActionLoading(false)
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

  const status = profile?.subscription_status || 'none'

  return (
    <MemberLayout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Membership</h1>
        <p className="mt-1 text-sm text-neutral-600">Manage your billing, pause, or cancel anytime.</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <CreditCard className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-neutral-900">Current Plan</h3>
            <p className="text-xs text-neutral-500">Your active membership</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">Plan</p>
            <p className="mt-1 font-serif text-lg font-semibold text-neutral-900">{plan?.name || 'No plan'}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">Price</p>
            <p className="mt-1 font-serif text-lg font-semibold text-neutral-900">
              {plan ? `${formatCurrency(plan.price_cents)}/${plan.interval}` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">Status</p>
            <p className={`mt-1 text-sm font-semibold capitalize ${
              status === 'active' ? 'text-success-600' : status === 'paused' ? 'text-warning-600' : status === 'canceled' ? 'text-error-600' : 'text-neutral-900'
            }`}>
              {status}
            </p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">Next Billing Date</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {status === 'active'
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>

        {plan && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-neutral-700">Included:</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {status === 'active' && (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
            Pause Membership
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={handleResume}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Resume Membership
          </button>
        )}

        {(status === 'active' || status === 'paused') && (
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-600 transition-colors hover:bg-error-100 disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Cancel Membership
          </button>
        )}

        <button
          onClick={handlePortal}
          disabled={portalLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60 sm:col-span-3"
        >
          {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          Manage Billing in Stripe Portal
        </button>
      </div>

      {/* Billing Info */}
      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Calendar className="h-5 w-5 text-primary-600" />
          </div>
          <h3 className="font-serif text-base font-semibold text-neutral-900">Billing Information</h3>
        </div>
        <div className="mt-4 space-y-3 text-sm text-neutral-600">
          <p>
            <Shield className="inline h-4 w-4 text-primary-600" /> Your billing is securely managed by Stripe.
            Your payment information is never stored on FreshlyForward servers.
          </p>
          <p>
            <Info className="inline h-4 w-4 text-primary-600" /> You can pause or cancel your membership anytime.
            Pausing suspends billing and service. Canceling ends your membership at the end of your current billing cycle.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 rounded-xl bg-neutral-50 border border-neutral-200 p-4">
        <div className="space-y-1 text-xs text-neutral-500">
          <p>Employment is never guaranteed.</p>
          <p>Applications are personally researched and submitted by a Career Strategist.</p>
          <p>Application volume depends on opportunity quality, member preferences, and membership level.</p>
          <p>Memberships may be paused or canceled according to the published billing policy.</p>
        </div>
      </div>
    </MemberLayout>
  )
}
