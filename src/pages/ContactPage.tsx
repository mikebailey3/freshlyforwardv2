import { Clock3, Mail, MessageCircle } from 'lucide-react'
import { ContactForm } from '@/components/ContactForm'

export function ContactPage() {
  return (
    <main className="contact-page shell">
      <section className="contact-copy"><p className="eyebrow">Contact FreshlyForward</p><h1>Tell us what moving forward looks like for you.</h1><p>Share where you are, what feels stuck, and what kind of support would make the biggest difference. A real person reads every note.</p><div className="contact-detail"><MessageCircle /><span><strong>Start with a conversation</strong>No pressure and no automated sales sequence.</span></div><div className="contact-detail"><Clock3 /><span><strong>Thoughtful response</strong>We typically reply within two business days.</span></div><div className="contact-detail"><Mail /><span><strong>Prefer email?</strong>hello@freshlyforward.com</span></div></section>
      <section className="contact-card"><h2>How can we help?</h2><ContactForm /></section>
    </main>
  )
}
