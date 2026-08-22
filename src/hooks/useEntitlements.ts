import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Feature, FeatureKey } from '@/types'

export interface EntitlementInfo {
  hasAccess: boolean
  feature: Feature | null
  loading: boolean
  features: Feature[]
  allowedKeys: Set<string>
  canAccess: (key: FeatureKey) => boolean
  getFeature: (key: FeatureKey) => Feature | undefined
  refresh: () => Promise<void>
}

export function useEntitlements(): EntitlementInfo {
  const { user, profile } = useAuth()
  const [features, setFeatures] = useState<Feature[]>([])
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setFeatures([])
      setAllowedKeys(new Set())
      setLoading(false)
      return
    }

    const [featuresRes, planFeaturesRes] = await Promise.all([
      supabase.from('features').select('*').order('sort_order', { ascending: true }),
      profile?.plan_id
        ? supabase
            .from('plan_features')
            .select('feature_id, is_enabled')
            .eq('plan_id', profile.plan_id)
            .eq('is_enabled', true)
        : Promise.resolve({ data: [], error: null }),
    ])

    const featureList = (featuresRes.data as Feature[]) || []
    setFeatures(featureList)

    const planFeatureRows = (planFeaturesRes.data as { feature_id: string; is_enabled: boolean }[]) || []
    const allowedFeatureIds = new Set(planFeatureRows.map((r) => r.feature_id))
    const allowed = new Set<string>(
      featureList.filter((f) => allowedFeatureIds.has(f.id)).map((f) => f.feature_key)
    )
    setAllowedKeys(allowed)
    setLoading(false)
  }, [user, profile?.plan_id])

  useEffect(() => {
    load()
  }, [load])

  const canAccess = useCallback(
    (key: FeatureKey): boolean => {
      if (!profile) return false
      const status = profile.subscription_status
      if (!['active', 'trialing', 'past_due'].includes(status || '')) return false
      return allowedKeys.has(key)
    },
    [profile, allowedKeys]
  )

  const getFeature = useCallback(
    (key: FeatureKey): Feature | undefined => features.find((f) => f.feature_key === key),
    [features]
  )

  return {
    hasAccess: allowedKeys.size > 0,
    feature: null,
    loading,
    features,
    allowedKeys,
    canAccess,
    getFeature,
    refresh: load,
  }
}
