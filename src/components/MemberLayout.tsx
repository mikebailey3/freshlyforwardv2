import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useBadges } from '@/hooks/useBadges'
import { BadgeStack, MembershipBadgeShield } from '@/components/Badges'
import { supabase } from '@/lib/supabase'
import {
  Compass, LayoutDashboard, User, CreditCard, Calendar, MessageSquare,
  Sparkles, Menu, X, LogOut, Search, FileText, Briefcase,
  Bell, Settings, Activity, Award, FileText as FileTextIcon,
  Lock, Video, Map, ChevronDown, Linkedin,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { FeatureKey, MembershipPlan } from '@/types'

interface NavItemConfig {
  to: string
  label: string
  icon: typeof LayoutDashboard
  feature?: FeatureKey
  requiredPlan?: string
  isNew?: boolean
  liveBadgeKey?: 'messages' | 'notifications'
}

interface NavGroup {
  label: string
  items: NavItemConfig[]
}

const navGroups: NavGroup[] = [
  {
    label: 'My Search',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/opportunities', label: 'Opportunities', icon: Search, feature: 'hand_selected_opportunities' },
      { to: '/opportunity-engine', label: 'Opportunity Engine', icon: Sparkles, isNew: true },
      { to: '/applications', label: 'Applications', icon: FileText, feature: 'applications' },
      { to: '/interviews', label: 'Interviews', icon: Briefcase },
      { to: '/profile', label: 'Career Profile', icon: User, feature: 'career_profile' },
      { to: '/linkedin-optimizer', label: 'LinkedIn Optimizer', icon: Linkedin, isNew: true },
    ],
  },
  {
    label: 'Planning & Tools',
    items: [
      { to: '/tools', label: 'Tools', icon: Sparkles, isNew: true },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
      { to: '/timeline', label: 'Timeline', icon: Calendar },
      { to: '/mock-interviews', label: 'Mock Interviews', icon: Video, feature: 'mock_interviews', requiredPlan: 'career-growth' },
      { to: '/friday-reports', label: 'Friday Reports', icon: FileTextIcon, feature: 'friday_reports' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/messages', label: 'Messages', icon: MessageSquare, feature: 'direct_messaging', liveBadgeKey: 'messages' },
      { to: '/notifications', label: 'Notifications', icon: Bell, liveBadgeKey: 'notifications' },
      { to: '/activity', label: 'Activity Feed', icon: Activity },
    ],
  },
  {
    label: 'Career Growth',
    items: [
      { to: '/career-success', label: 'Career Success', icon: Sparkles, feature: 'workplace_success_coaching', requiredPlan: 'career-concierge' },
      { to: '/achievement-vault', label: 'Achievement Vault', icon: Award, feature: 'achievement_vault', requiredPlan: 'career-concierge' },
      { to: '/roadmap', label: 'Roadmap', icon: Map, feature: 'career_roadmap', requiredPlan: 'career-concierge' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/founding-member', label: 'Founding Member', icon: Award },
      { to: '/membership', label: 'Membership', icon: CreditCard },
      { to: '/settings/communication', label: 'Settings', icon: Settings },
    ],
  },
]

export function MemberLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth()
  const { canAccess } = useEntitlements()
  const { membershipBadges } = useBadges(user?.id)
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (!user) return

    if (profile?.plan_id) {
      supabase
        .from('membership_plans')
        .select('*')
        .eq('id', profile.plan_id)
        .maybeSingle()
        .then(({ data }) => setPlan((data as MembershipPlan) || null))
    }

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadMessages(count || 0))

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadNotifications(count || 0))
  }, [user, profile?.plan_id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const liveBadgeCount = (key?: 'messages' | 'notifications') => {
    if (key === 'messages') return unreadMessages
    if (key === 'notifications') return unreadNotifications
    return 0
  }

  const renderNavIcon = (item: NavItemConfig) => {
    if (item.feature && !canAccess(item.feature)) {
      return <Lock className="h-4 w-4 text-neutral-400" />
    }
    return <item.icon className="h-5 w-5" />
  }

  const renderNavLink = (item: NavItemConfig, onNavigate?: () => void) => {
    const isActive = location.pathname === item.to
    const isLocked = item.feature ? !canAccess(item.feature) : false
    const count = liveBadgeCount(item.liveBadgeKey)

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
        } ${isLocked ? 'opacity-70' : ''}`}
      >
        {renderNavIcon(item)}
        {item.label}
        {item.isNew && (
          <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-700">
            New
          </span>
        )}
        {!item.isNew && count > 0 && (
          <span className="ml-auto rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
            {count}
          </span>
        )}
        {isLocked && item.requiredPlan && (
          <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
            {item.requiredPlan === 'career-growth' ? 'Growth' : item.requiredPlan === 'career-concierge' ? 'Concierge' : ''}
          </span>
        )}
      </Link>
    )
  }

  const renderNavGroups = (onNavigate?: () => void) => (
    <>
      {navGroups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => renderNavLink(item, onNavigate))}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-neutral-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <Link to="/dashboard" className="flex items-center gap-2 border-b border-neutral-200 px-6 py-5">
            <Compass className="h-7 w-7 text-primary-600" />
            <span className="font-serif text-lg font-semibold text-neutral-900">FreshlyForward</span>
          </Link>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {renderNavGroups()}
          </nav>

          <div className="border-t border-neutral-200 p-3">
            <div className="mb-2 flex items-center gap-2 px-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profile?.full_name || 'M').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-neutral-800">
                  {profile?.full_name || profile?.headline || 'Member'}
                </p>
                <BadgeStack badges={membershipBadges} />
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop top header */}
      <header className="sticky top-0 z-20 hidden border-b border-neutral-200 bg-white/90 backdrop-blur lg:block lg:pl-64">
        <div className="flex items-center justify-end gap-4 px-6 py-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              placeholder="Search opportunities, tools, and more..."
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none"
            />
          </div>
          <Link to="/notifications" className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-50">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-600" />
            )}
          </Link>
          {plan && membershipBadges[0] && (
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5">
              <MembershipBadgeShield badge={membershipBadges[0]} size="sm" />
              <div className="leading-tight">
                <p className="text-xs font-semibold text-neutral-900">{plan.name}</p>
                <p className="text-[10px] text-neutral-500">
                  Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            </div>
          )}
        </div>
      </header>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary-600" />
            <span className="font-serif text-base font-semibold text-neutral-900">FreshlyForward</span>
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileNavOpen && (
        <nav className="fixed inset-0 z-50 overflow-y-auto bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <Link to="/dashboard" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary-600" />
              <span className="font-serif text-base font-semibold text-neutral-900">FreshlyForward</span>
            </Link>
            <button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-3">
            {renderNavGroups(() => setMobileNavOpen(false))}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
            { to: '/opportunities', label: 'Opps', icon: Search },
            { to: '/applications', label: 'Apps', icon: FileText },
            { to: '/messages', label: 'Chat', icon: MessageSquare },
            { to: '/notifications', label: 'Alerts', icon: Bell },
          ].map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium ${
                  isActive ? 'text-primary-600' : 'text-neutral-500'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
