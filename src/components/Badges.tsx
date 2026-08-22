import {
  Leaf, TrendingUp, Gem, Sparkles, CheckCircle2, FileText, MessageSquare,
  Briefcase, Trophy, CalendarCheck, Target, Star, Medal, Award,
} from 'lucide-react'
import type { Badge, BadgeColorScheme } from '@/types'

// ============================================================
// Icon + color lookup tables
// ============================================================
const BADGE_ICONS: Record<string, typeof Award> = {
  Leaf, TrendingUp, Gem, Sparkles, CheckCircle2, FileText, MessageSquare,
  Briefcase, Trophy, CalendarCheck, Target, Star, Medal, Award,
}

function getBadgeIcon(icon: string) {
  return BADGE_ICONS[icon] || Award
}

interface ColorStyle {
  shieldGradient: string
  ring: string
  iconBg: string
  iconText: string
  pillBg: string
  pillText: string
  pillBorder: string
}

const COLOR_STYLES: Record<BadgeColorScheme, ColorStyle> = {
  green: {
    shieldGradient: 'from-primary-600 to-primary-800',
    ring: 'ring-primary-300',
    iconBg: 'bg-primary-100',
    iconText: 'text-primary-600',
    pillBg: 'bg-primary-50',
    pillText: 'text-primary-700',
    pillBorder: 'border-primary-200',
  },
  gold: {
    shieldGradient: 'from-neutral-900 via-neutral-900 to-neutral-800',
    ring: 'ring-accent-400',
    iconBg: 'bg-accent-100',
    iconText: 'text-accent-700',
    pillBg: 'bg-accent-50',
    pillText: 'text-accent-800',
    pillBorder: 'border-accent-300',
  },
  navy: {
    shieldGradient: 'from-neutral-800 to-neutral-950',
    ring: 'ring-neutral-500',
    iconBg: 'bg-neutral-100',
    iconText: 'text-neutral-700',
    pillBg: 'bg-neutral-100',
    pillText: 'text-neutral-800',
    pillBorder: 'border-neutral-300',
  },
  silver: {
    shieldGradient: 'from-neutral-400 to-neutral-600',
    ring: 'ring-neutral-300',
    iconBg: 'bg-neutral-100',
    iconText: 'text-neutral-500',
    pillBg: 'bg-neutral-50',
    pillText: 'text-neutral-600',
    pillBorder: 'border-neutral-200',
  },
  blue: {
    shieldGradient: 'from-secondary-500 to-secondary-700',
    ring: 'ring-secondary-300',
    iconBg: 'bg-secondary-100',
    iconText: 'text-secondary-600',
    pillBg: 'bg-secondary-50',
    pillText: 'text-secondary-700',
    pillBorder: 'border-secondary-200',
  },
  purple: {
    shieldGradient: 'from-purple-500 to-purple-700',
    ring: 'ring-purple-300',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    pillBg: 'bg-purple-50',
    pillText: 'text-purple-700',
    pillBorder: 'border-purple-200',
  },
}

const SHIELD_CLIP = '[clip-path:polygon(50%_0%,100%_15%,100%_58%,50%_100%,0%_58%,0%_15%)]'

const SHIELD_SIZES = {
  sm: 'h-5 w-[17px]',
  md: 'h-8 w-[27px]',
  lg: 'h-12 w-[40px]',
} as const

const CIRCLE_SIZES = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const

const ICON_SIZES = {
  sm: 'h-2.5 w-2.5',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
} as const

export type BadgeSize = 'sm' | 'md' | 'lg'

// ============================================================
// MembershipBadgeShield -- shield-shaped, for the 5 membership/status badges
// ============================================================
export function MembershipBadgeShield({
  badge,
  size = 'md',
  showLabel = false,
}: {
  badge: Badge
  size?: BadgeSize
  showLabel?: boolean
}) {
  const style = COLOR_STYLES[badge.color_scheme] || COLOR_STYLES.green
  const Icon = getBadgeIcon(badge.icon)

  return (
  <div className="inline-flex flex-col items-center gap-1" title={badge.description}>
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${style.shieldGradient} ${SHIELD_CLIP} ${SHIELD_SIZES[size]} shadow-sm ring-1 ${style.ring}`}
      >
        <Icon className={`${ICON_SIZES[size]} text-white`} strokeWidth={2.25} />
      </div>
      {showLabel && (
        <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
          {badge.name}
        </span>
      )}
    </div>
  )
}

// ============================================================
// AchievementBadgeCircle -- circular, for the 11 milestone badges
// ============================================================
export function AchievementBadgeCircle({
  badge,
  size = 'md',
  showLabel = false,
  locked = false,
}: {
  badge: Badge
  size?: BadgeSize
  showLabel?: boolean
  locked?: boolean
}) {
  const style = COLOR_STYLES[badge.color_scheme] || COLOR_STYLES.green
  const Icon = getBadgeIcon(badge.icon)

  return (
    <div className="inline-flex flex-col items-center gap-1.5" title={badge.description}>
      <div
        className={`flex items-center justify-center rounded-full ${CIRCLE_SIZES[size]} ${
          locked ? 'bg-neutral-100' : style.iconBg
        }`}
      >
        <Icon className={`${ICON_SIZES[size]} ${locked ? 'text-neutral-300' : style.iconText}`} strokeWidth={2} />
      </div>
      {showLabel && (
        <span className={`text-center text-xs font-medium ${locked ? 'text-neutral-400' : 'text-neutral-700'}`}>
          {badge.name}
        </span>
      )}
    </div>
  )
}

// ============================================================
// BadgePillCompact -- small inline pill for profile headers, messages,
// and admin member lists (matches the badge spec's "Usage Examples")
// ============================================================
export function BadgePillCompact({ badge }: { badge: Badge }) {
  const style = COLOR_STYLES[badge.color_scheme] || COLOR_STYLES.green
  const Icon = getBadgeIcon(badge.icon)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style.pillBg} ${style.pillText} ${style.pillBorder}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {badge.name}
    </span>
  )
}

// ============================================================
// BadgeStack -- renders a row of pills, used wherever a member's earned
// membership badges need to show next to their name
// ============================================================
export function BadgeStack({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <BadgePillCompact key={badge.id} badge={badge} />
      ))}
    </div>
  )
}
