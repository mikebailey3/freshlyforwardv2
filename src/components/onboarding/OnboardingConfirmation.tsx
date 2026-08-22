import { useAuth } from '@/context/AuthContext'
import { Check, CreditCard, Calendar, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { MemberProfile } from '@/types'

interface OnboardingStepProps {
  onNext: () => void
  onBack: () => void
  profile: MemberProfile | null
  user: { id: string; email?: string } | null
  checkoutSuccess?: boolean
}

export function OnboardingConfirmation({ profile, checkoutSuccess }: OnboardingStepProps) {
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Membership Confirmation
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Review your membership details below.
      </p>

      {checkoutSuccess && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-success-50 border border-success-200 p-4">
          <Check className="h-5 w-5 text-success-600" />
          <p className="text-sm font-medium text-success-700">Payment successful! Your membership is now active.</p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
            <CreditCard className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-neutral-900">Active Membership</h2>
            <p className="text-sm text-neutral-600">
              {profile?.subscription_status === 'active' ? 'Your membership is active.' : 'Membership will be activated after payment.'}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Status</span>
            <span className={`text-sm font-semibold capitalize ${
              profile?.subscription_status === 'active' ? 'text-success-600' : 'text-neutral-900'
            }`}>
              {profile?.subscription_status || 'pending'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Billing Cycle</span>
            <span className="text-sm font-semibold text-neutral-900">Monthly</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Next Billing Date</span>
            <span className="text-sm font-semibold text-neutral-900">
              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3">
            <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
            <div>
              <p className="text-xs font-semibold text-neutral-900">Pause Anytime</p>
              <p className="text-xs text-neutral-600">Pause your membership and resume when ready.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
            <div>
              <p className="text-xs font-semibold text-neutral-900">Cancel Anytime</p>
              <p className="text-xs text-neutral-600">No long-term contracts. Cancel whenever you need.</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500">
        You can manage your billing, invoices, and payment methods from the Membership page at any time.
      </p>
    </div>
  )
}
