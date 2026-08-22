import { ArrowRight, Check, Heart, Lightbulb, ShieldCheck } from 'lucide-react'
import { LinkButton, SectionHeading } from '@/components/ui'

export function AboutPage() {
  return (
    <main>
      <section className="about-hero shell">
        <div><p className="eyebrow">About FreshlyForward</p><h1>Career support should feel personal—because the decision is.</h1><p>FreshlyForward was created to give job seekers the kind of thoughtful, practical help that is difficult to find in a market built for speed and scale.</p><LinkButton to="/contact">Meet FreshlyForward <ArrowRight size={18} /></LinkButton></div>
        <div className="about-portrait"><img src="/images/headshot.png?v=2" alt="Mike Bailey, founder of FreshlyForward" /><div><strong>Mike Bailey</strong><span>Founder & Career Strategist</span></div></div>
      </section>
      <section className="founder-note shell"><div><p className="eyebrow">A note from Mike</p><h2>"The hardest part of a job search is rarely ambition. It is carrying every detail alone."</h2></div><div><p>I built FreshlyForward around a simple belief: job seekers deserve a capable person beside them—someone who can see the whole story, manage the moving pieces, and bring judgment to every opportunity.</p><p>That means fewer shortcuts, more context, and a service that stays accountable to the person behind the resume.</p><p className="signature">Mike Bailey</p></div></section>
      <section className="values-section shell"><SectionHeading eyebrow="Our standards" title="How we choose to work" /><div className="values-grid"><article><Heart /><h3>Care before scale</h3><p>We protect quality by keeping the work personal and considered.</p></article><article><Lightbulb /><h3>Context before action</h3><p>We understand the why before deciding what comes next.</p></article><article><ShieldCheck /><h3>Trust before convenience</h3><p>Your authorization, privacy, and voice guide the service.</p></article></div></section>
      <section className="about-checklist shell"><h2>What you can expect from us</h2>{['Honest guidance, even when it is not the easy answer', 'Clear communication and Friday progress updates', 'Applications built around your actual experience', 'Respect for your time, privacy, and career decisions'].map((item) => <p key={item}><Check />{item}</p>)}</section>
    </main>
  )
}
