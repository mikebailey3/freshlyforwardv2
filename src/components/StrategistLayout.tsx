import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Compass, LayoutDashboard, Users, Search, FileText, BarChart3,
  Menu, X, LogOut, User, ShieldCheck, Newspaper, Sparkles, ClipboardCheck,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/strategist', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/strategist/members', label: 'Members', icon: Users },
  { to: '/strategist/opportunities', label: 'Opportunities', icon: Search },
  { to: '/strategist/opportunity-engine', label: 'Opportunity Engine', icon: Sparkles },
  { to: '/strategist/applications', label: 'Applications', icon: FileText },
  { to: '/strategist/friday-reports', label: 'Friday Reports', icon: FileText },
  { to: '/strategist/blog-posts', label: 'Blog Posts', icon: Newspaper },
]

const adminNavItems = [
  { to: '/admin', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/members', label: 'All Members', icon: ShieldCheck },
  { to: '/admin/report-review', label: 'Report Review', icon: ClipboardCheck },
]

export function StrategistLayout({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
  const { signOut, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const items = [...navItems, ...(isAdmin ? adminNavItems : [])]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-neutral-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <Link to="/strategist" className="flex items-center gap-2 border-b border-neutral-200 px-6 py-5">
            <Compass className="h-7 w-7 text-primary-600" />
            <div>
              <span className="font-serif text-lg font-semibold text-neutral-900">FreshlyForward</span>
              <span className="block text-xs text-primary-600">{isAdmin ? 'Admin' : 'Strategist'}</span>
            </div>
          </Link>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-neutral-200 p-3">
            <Link
              to="/dashboard"
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <User className="h-5 w-5" />
              Member View
            </Link>
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

      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/strategist" className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary-600" />
            <span className="font-serif text-base font-semibold text-neutral-900">FreshlyForward</span>
            <span className="text-xs text-primary-600">{isAdmin ? 'Admin' : 'Strategist'}</span>
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
        <nav className="fixed inset-0 z-50 bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <Link to="/strategist" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary-600" />
              <span className="font-serif text-base font-semibold text-neutral-900">FreshlyForward</span>
            </Link>
            <button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-1 p-3">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/dashboard"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <User className="h-5 w-5" />
              Member View
            </Link>
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
          {navItems.map((item) => {
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
