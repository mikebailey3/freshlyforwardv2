import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ensureProfile } from '@/lib/profile'
import { formatCurrency } from '@/lib/utils'
import { Compass, Check, AlertCircle, Loader2, CreditCard, Tag } from 'lucide-react'
import type { MembershipPlan } from '@/types'

export function CheckoutPage() {
  const { planSlug } = useParams<{ planSlug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null)
  const [discountError, setDiscountError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    Promise.all([
      supabase
        .from('membership_plans')
        .select('*')
        .eq('slug', planSlug)
        .eq('is_enabled', true)
        .eq('is_archived', false)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) {
            setError('Plan not found.')
            return null
          }
          setPlan(data as MembershipPlan)
          return data
        }),
      ensureProfile(user.id),
    ]).finally(() => setLoading(false))
  }, [user, planSlug])

  const handleApplyDiscount = async (e: FormEvent) => {
    e.preventDefault()
    setDiscountError(null)

    if (!discountCode.trim()) return

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      setDiscountError('Invalid or expired discount code.')
      return
    }

    const discount = data as { code: string; discount_type: string; discount_value: number }
    setAppliedDiscount(discount.code)
  }

  const handleCheckout = async () => {
    if (!user || !plan) return
    setProcessing(true)
    setError(null)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          plan_slug: plan.slug,
          discount_code: appliedDiscount,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Checkout setup failed. Stripe may not be configured yet.')
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
        return
      }

      if (data.fallback) {
        await supabase
          .from('member_profiles')
          .update({ plan_id: plan.id, subscription_status: 'active' })
          .eq('user_id', user.id)
        navigate('/onboarding')
        return
      }

      throw new Error('Unexpected response from checkout service.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <AlertCircle className="h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-neutral-600">{error || 'Plan not found.'}</p>
        <Link to="/pricing" className="mt-4 text-primary-600 hover:underline">
          View all plans
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <Compass className="h-7 w-7 text-primary-600" />
          <span className="font-serif text-xl font-semibold text-neutral-900">FreshlyForward</span>
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">Checkout</h1>
          <p className="mt-2 text-sm text-neutral-600">Review your plan and complete your purchase.</p>

          {/* Plan Summary */}
          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-neutral-900">{plan.name}</h2>
                {plan.badge && (
                  <span className="mt-1 inline-block rounded-full bg-primary-100 px-3 py-0.5 text-xs font-medium text-primary-700">
                    {plan.badge}
                  </span>
                )}
                <p className="mt-2 text-sm text-neutral-600">{plan.description}</p>
              </div>
              <div className="text-right">
                <div className="font-serif text-3xl font-bold text-neutral-900">
                  {formatCurrency(plan.price_cents)}
                </div>
                <div className="text-sm text-neutral-500">/{plan.interval}</div>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Discount Code */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700">Discount Code</label>
            <form onSubmit={handleApplyDiscount} className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Enter discount code"
                  className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-3 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Apply
              </button>
            </form>
            {appliedDiscount && (
              <p className="mt-2 text-sm text-success-600">Discount code "{appliedDiscount}" applied.</p>
            )}
            {discountError && (
              <p className="mt-2 text-sm text-error-600">{discountError}</p>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 disabled:opacity-60"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Complete Checkout
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Your membership can be paused or canceled anytime according to our billing policy.
          </p>
        </div>
      </div>
    </div>
  )
}
