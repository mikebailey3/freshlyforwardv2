import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, LockKeyhole, AlertCircle } from 'lucide-react'

export function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planSlug = searchParams.get('plan')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error: signUpError } = await signUp(email, password)
    if (signUpError) {
      setError(signUpError)
      setLoading(false)
    } else {
      // If a plan was already selected (from the Pricing page), continue to
      // checkout for that plan. Otherwise, get the member straight into the
      // career wizard so they can start building their profile immediately.
      navigate(planSlug ? `/checkout/${planSlug}` : '/onboarding')
    }
  }

  return (
    <main className="auth-page shell">
      <section className="auth-story">
        <p className="eyebrow">Start moving forward</p>
        <h1>A better search starts with a conversation.</h1>
        <p>Tell us a little about what you need. We'll use your answers to prepare a focused introductory conversation.</p>
        <div className="auth-note"><LockKeyhole /><span><strong>Private by design</strong>Your career information is handled with care and only used to deliver your service.</span></div>
      </section>
      <section className="auth-card">
        <h2>Request an introduction</h2>
        <p>No contract. No obligation. Just a thoughtful first step.</p>
        {planSlug && (
          <p style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: 'var(--mint)', fontSize: '.85rem', color: 'var(--navy)' }}>
            You selected the <strong style={{ textTransform: 'capitalize' }}>{planSlug.replace('-', ' ')}</strong> plan. Complete your account to continue to checkout.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>Confirm Password<input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Continue'} <ArrowRight size={18} /></button>
        </form>
        <p className="auth-switch">Already a client? <Link to="/signin">Log in</Link></p>
      </section>
    </main>
  )
}
