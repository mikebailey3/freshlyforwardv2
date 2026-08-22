import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, X, ArrowRight } from 'lucide-react'
import { useEntitlements } from '@/hooks/useEntitlements'
import type { Feature, FeatureKey } from '@/types'

const planDisplayNames: Record<string, string> = {
  'founding-member': 'Founding Member',
  'career-growth': 'Career Growth',
  'career-concierge': 'Career Concierge',
}

export function getPlanDisplayName(slug: string): string {
  return planDisplayNames[slug] || slug
}

interface UpgradeModalProps {
  feature: Feature | null
  featureKey: FeatureKey
  featureName?: string
  requiredPlan?: string
  featureDescription?: string
  upgradeUrl?: string
  isOpen: boolean
  onClose: () => void
}

export function UpgradeModal({
  feature,
  featureKey,
  featureName,
  requiredPlan,
  featureDescription,
  upgradeUrl,
  isOpen,
  onClose,
}: UpgradeModalProps) {
  if (!isOpen) return null

  const displayName = featureName || feature?.display_name || featureKey.replace(/_/g, ' ')
  const title = feature?.upgrade_title || `Unlock ${displayName}`
  const body =
    feature?.upgrade_body ||
    featureDescription ||
    `${displayName} is not included in your current plan. Upgrade to access this feature.`
  const cta = feature?.upgrade_cta || 'Upgrade Now'
  const upgradeLink = upgradeUrl || (requiredPlan ? `/checkout/${requiredPlan}` : '/pricing')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
          <Lock className="h-6 w-6 text-primary-600" />
        </div>

        <h2 id="upgrade-modal-title" className="mt-4 font-serif text-xl font-semibold text-neutral-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{body}</p>

        {requiredPlan && (
          <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200 p-4">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Included with
            </p>
            <p className="mt-1 font-serif text-lg font-semibold text-neutral-900">
              {getPlanDisplayName(requiredPlan)}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to={upgradeLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            {cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pricing"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            View Plans
          </Link>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          Maybe Later
        </button>
      </div>
    </div>
  )
}

interface FeatureGateProps {
  feature: FeatureKey
  requiredPlan?: string
  children: ReactNode
  fallback?: ReactNode
  showLocked?: boolean
  lockedCard?: ReactNode
}

export function FeatureGate({
  feature,
  requiredPlan,
  children,
  fallback,
  showLocked = true,
  lockedCard,
}: FeatureGateProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { canAccess, getFeature, loading } = useEntitlements()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (canAccess(feature)) {
    return <>{children}</>
  }

  if (fallback) return <>{fallback}</>

  if (!showLocked) return null

  if (lockedCard) {
    return (
      <>
        <div onClick={() => setModalOpen(true)} className="cursor-pointer">
          {lockedCard}
        </div>
        <UpgradeModal
          feature={getFeature(feature) || null}
          featureKey={feature}
          requiredPlan={requiredPlan}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    )
  }

  return (
    <>
      <LockedFeatureCard
        featureKey={feature}
        requiredPlan={requiredPlan}
        onUpgrade={() => setModalOpen(true)}
      />
      <UpgradeModal
        feature={getFeature(feature) || null}
        featureKey={feature}
        requiredPlan={requiredPlan}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}

interface LockedFeatureCardProps {
  featureKey: FeatureKey
  requiredPlan?: string
  onUpgrade: () => void
  title?: string
  description?: string
  icon?: ReactNode
}

export function LockedFeatureCard({
  featureKey,
  requiredPlan,
  onUpgrade,
  title,
  description,
  icon,
}: LockedFeatureCardProps) {
  const { getFeature } = useEntitlements()
  const feature = getFeature(featureKey)
  const displayName = title || feature?.display_name || featureKey.replace(/_/g, ' ')
  const desc = description || feature?.description || ''
  const planLabel = requiredPlan ? getPlanDisplayName(requiredPlan) : ''

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:shadow-md cursor-pointer"
      onClick={onUpgrade}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100">
          {icon || <Lock className="h-6 w-6 text-neutral-400" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-semibold text-neutral-900">{displayName}</h3>
            <Lock className="h-4 w-4 text-neutral-400" />
          </div>
          {desc && <p className="mt-1 text-sm text-neutral-600">{desc}</p>}
          {planLabel && (
            <div className="mt-3">
              <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
                Available with {planLabel}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
        <span>Upgrade to unlock</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  )
}

interface UpgradeRequiredPageProps {
  featureKey: FeatureKey
  requiredPlan?: string
}

export function UpgradeRequiredPage({ featureKey, requiredPlan }: UpgradeRequiredPageProps) {
  const [modalOpen, setModalOpen] = useState(true)
  const { getFeature } = useEntitlements()
  const feature = getFeature(featureKey)
  const displayName = feature?.display_name || featureKey.replace(/_/g, ' ')

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
          <Lock className="h-8 w-8 text-neutral-400" />
        </div>
        <h1 className="mt-6 font-serif text-2xl font-semibold text-neutral-900">
          {displayName} requires an upgrade
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {feature?.upgrade_body ||
            `This feature is not included in your current plan. Upgrade to access ${displayName}.`}
        </p>
        {requiredPlan && (
          <div className="mt-4 inline-block rounded-xl bg-neutral-50 border border-neutral-200 px-6 py-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Included with
            </p>
            <p className="mt-1 font-serif text-lg font-semibold text-neutral-900">
              {getPlanDisplayName(requiredPlan)}
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to={requiredPlan ? `/checkout/${requiredPlan}` : '/pricing'}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            {feature?.upgrade_cta || 'Upgrade Now'}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pricing"
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            View Plans
          </Link>
        </div>
        <button
          onClick={() => setModalOpen(false)}
          className="mt-4 text-sm text-neutral-500 hover:text-neutral-700"
        >
          Maybe Later
        </button>
      </div>
      <UpgradeModal
        feature={feature || null}
        featureKey={featureKey}
        requiredPlan={requiredPlan}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
