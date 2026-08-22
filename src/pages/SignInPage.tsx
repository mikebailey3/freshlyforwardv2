import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, LockKeyhole, AlertCircle } from 'lucide-react'

export function SignInPage() {
  const { signIn, user, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && role) {
      const redirect = searchParams.get('redirect')
      const target = redirect || (role === 'admin' ? '/admin' : role === 'strategist' ? '/strategist' : '/dashboard')
      navigate(target, { replace: true })
    }
  }, [user, role, navigate, searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError(signInError)
        setLoading(false)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="auth-page shell">
      <section className="auth-story">
        <p className="eyebrow">Welcome back</p>
        <h1>Your career search, all in one place.</h1>
        <p>Access your weekly progress, opportunities, documents, messages, and interview preparation.</p>
        <div className="auth-note"><LockKeyhole /><span><strong>Private by design</strong>Your career information is handled with care and only used to deliver your service.</span></div>
      </section>
      <section className="auth-card">
        <h2>Client login</h2>
        <p>Enter the email associated with your FreshlyForward account.</p>
        {error && (
          <p className="form-error" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Log in'} <ArrowRight size={18} /></button>
        </form>
        <p className="auth-switch">New to FreshlyForward? <Link to="/signup">Get started</Link></p>
      </section>
    </main>
  )
}
