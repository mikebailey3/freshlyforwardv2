import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

const navigation = [
  ['/how-it-works', 'How It Works'],
  ['/services', 'Services'],
  ['/why-freshlyforward', 'Why FreshlyForward'],
  ['/pricing', 'Pricing'],
  ['/forward-feed', 'The Forward Feed'],
  ['/about', 'About'],
] as const

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="FreshlyForward home">
      <img src="/images/c1d368c4-ef41-494f-9a54-f5303e6f864d.png?v=2" alt="FreshlyForward — Your Next Chapter Starts Here" />
    </Link>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <button className="menu-button" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? 'nav-open' : ''} aria-label="Primary navigation">
          {navigation.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>)}
          <div className="nav-actions">
            {user ? (
              <>
                <Link to="/dashboard" className="nav-login" onClick={() => setOpen(false)}>Dashboard</Link>
                <button className="button button-primary button-small" onClick={() => { signOut(); setOpen(false) }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="nav-login" onClick={() => setOpen(false)}>Log in</Link>
                <Link to="/signup" className="button button-primary button-small" onClick={() => setOpen(false)}>Get started</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  const { role } = useAuth()

  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand"><Logo /><p>Human-led career search support for people ready to move forward with intention.</p></div>
        <div><strong>Explore</strong><Link to="/how-it-works">How It Works</Link><Link to="/services">Services</Link><Link to="/pricing">Pricing</Link><Link to="/forward-feed">The Forward Feed</Link><Link to="/faq">FAQ</Link></div>
        <div><strong>Company</strong><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/why-freshlyforward">Why FreshlyForward</Link><Link to="/authorization">Authorization</Link></div>
        <div><strong>Legal</strong><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/signin">Client login</Link><Link to="/signup">Get started</Link></div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 FreshlyForward. All rights reserved.</span>
        <span>Real people. Thoughtful work. Forward momentum.</span>
      </div>
      {role === 'admin' && (
        <div className="shell" style={{ paddingTop: '10px' }}>
          <Link to="/admin" style={{ fontSize: '.7rem', color: '#9aa6b4', opacity: .6 }}>Admin</Link>
        </div>
      )}
    </footer>
  )
}
