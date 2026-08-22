import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      const response = await fetch('/__forms.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(Array.from(formData.entries()).map(([key, value]) => [key, String(value)])).toString(),
      })
      if (!response.ok) throw new Error('Submission failed')
      form.reset()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <div className="form-success" role="status"><CheckCircle2 /><h2>Thanks for reaching out.</h2><p>A FreshlyForward strategist reviews your note and follows up with next steps.</p></div>
  }

  return (
    <form className="contact-form" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit}>
      <input type="hidden" name="form-name" value="contact" />
      <p className="bot-field"><label>Do not fill this out: <input name="bot-field" /></label></p>
      <label>Full name<input name="name" autoComplete="name" required /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Where are you in your search?<select name="search-stage" defaultValue="" required><option value="" disabled>Select one</option><option>Actively applying</option><option>Planning a transition</option><option>Returning to work</option><option>Exploring options</option></select></label>
      <label>How can we help?<textarea name="message" rows={5} required /></label>
      <button className="button button-primary" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending…' : 'Send my note'}</button>
      {status === 'error' && <p className="form-error" role="alert">Something went wrong. Please try again.</p>}
    </form>
  )
}
