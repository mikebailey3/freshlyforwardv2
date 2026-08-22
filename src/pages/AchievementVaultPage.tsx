import { useEffect, useState } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { useBadges } from '@/hooks/useBadges'
import { MembershipBadgeShield, AchievementBadgeCircle } from '@/components/Badges'
import { supabase } from '@/lib/supabase'
import { Award, Loader2 } from 'lucide-react'
import type { Badge } from '@/types'

export function AchievementVaultPage() {
  const { user } = useAuth()
  const { earnedBadges, hasBadge, loading: badgesLoading } = useBadges(user?.id)
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Error loading badges:', error)
        setAllBadges((data as Badge[]) || [])
        setLoading(false)
      })
  }, [])

  const membershipBadges = allBadges.filter((b) => b.badge_type === 'membership')
  const achievementBadges = allBadges.filter((b) => b.badge_type === 'achievement')
  const earnedCount = earnedBadges.length

  if (loading || badgesLoading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mb-6 flex items-center gap-2">
        <Award className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Achievement Vault</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {earnedCount} of {allBadges.length} badges earned. Every badge is earned through real progress.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="font-serif text-base font-semibold text-neutral-900">Membership Badges</h2>
        <p className="mt-1 text-xs text-neutral-500">Show your current membership and special status.</p>
        <div className="mt-5 flex flex-wrap gap-8">
          {membershipBadges.map((badge) => (
            <div key={badge.id} className={`flex flex-col items-center ${hasBadge(badge.slug) ? '' : 'opacity-30 grayscale'}`}>
              <MembershipBadgeShield badge={badge} size="lg" />
              <p className="mt-2 max-w-[110px] text-center text-xs font-semibold text-neutral-800">{badge.name}</p>
              <p className="mt-0.5 max-w-[130px] text-center text-[11px] text-neutral-500">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="font-serif text-base font-semibold text-neutral-900">Achievement Badges</h2>
        <p className="mt-1 text-xs text-neutral-500">Earned by reaching meaningful milestones.</p>
        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-6">
          {achievementBadges.map((badge) => {
            const earned = hasBadge(badge.slug)
            return (
              <div key={badge.id} className="flex flex-col items-center">
                <AchievementBadgeCircle badge={badge} size="lg" locked={!earned} />
                <p className={`mt-2 text-center text-xs font-medium ${earned ? 'text-neutral-800' : 'text-neutral-400'}`}>
                  {badge.name}
                </p>
                <p className="mt-0.5 text-center text-[11px] text-neutral-400">{badge.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {earnedCount === 0 && (
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100 p-6 text-center">
          <p className="text-sm text-neutral-600">
            You haven't earned any badges yet. Complete your Career Profile, submit applications, and land
            interviews to start unlocking achievements.
          </p>
        </div>
      )}
    </MemberLayout>
  )
}
