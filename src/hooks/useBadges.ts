import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Badge, MemberBadge } from '@/types'

export interface BadgeInfo {
  loading: boolean
  earnedBadges: MemberBadge[]
  membershipBadges: Badge[]
  achievementBadges: Badge[]
  hasBadge: (slug: string) => boolean
  refresh: () => Promise<void>
}

export function useBadges(userId?: string): BadgeInfo {
  const { user } = useAuth()
  const targetUserId = userId || user?.id
  const [earnedBadges, setEarnedBadges] = useState<MemberBadge[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!targetUserId) {
      setEarnedBadges([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('member_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', targetUserId)
      .order('awarded_at', { ascending: false })

    if (error) {
      console.error('Error loading badges:', error)
    } else {
      setEarnedBadges((data as MemberBadge[]) || [])
    }
    setLoading(false)
  }, [targetUserId])

  useEffect(() => {
    load()
  }, [load])

  const hasBadge = useCallback(
    (slug: string) => earnedBadges.some((mb) => mb.badge?.slug === slug),
    [earnedBadges]
  )

  const membershipBadges = earnedBadges
    .filter((mb) => mb.badge?.badge_type === 'membership')
    .map((mb) => mb.badge!)
    .filter(Boolean)

  const achievementBadges = earnedBadges
    .filter((mb) => mb.badge?.badge_type === 'achievement')
    .map((mb) => mb.badge!)
    .filter(Boolean)

  return {
    loading,
    earnedBadges,
    membershipBadges,
    achievementBadges,
    hasBadge,
    refresh: load,
  }
}
