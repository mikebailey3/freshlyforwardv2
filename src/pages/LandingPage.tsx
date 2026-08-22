import { ArrowRight, CalendarCheck, Check, ClipboardCheck, FilePenLine, Handshake, MessageCircleMore, PauseCircle, Search, ShieldCheck, Sparkles, Target, UserRoundCheck, X } from 'lucide-react'
import { LinkButton, SectionHeading } from '@/components/ui'
import { ForwardFeedWidget } from '@/components/ForwardFeedWidget'

const promises = [
  { icon: ShieldCheck, title: '100% Human-Led Service', copy: 'No bots, no shortcuts. Every decision is made by a real career professional.' },
  { icon: Search, title: 'Hand-Selected Opportunities', copy: 'We research roles for fit, trajectory, compensation, and your personal goals.' },
  { icon: FilePenLine, title: 'Hand-Crafted Applications', copy: 'Every resume adjustment and cover letter is built around one specific opportunity.' },
  { icon: CalendarCheck, title: 'Weekly Progress Every Friday', copy: 'See what we found, where we applied, and what happens next—every single week.' },
  { icon: MessageCircleMore, title: 'Personal Strategist Support', copy: 'Your dedicated strategist stays available for questions, decisions, and momentum.' },
  { icon: PauseCircle, title: 'No Contracts. Pause Anytime.', copy: 'A flexible month-to-month partnership designed around real life and real careers.' },
]

const steps: [string, string, string][] = [
  ['01', 'Tell us your story', 'We learn your background, goals, preferences, strengths, and non-negotiables.'],
  ['02', 'Build your strategy', 'Your strategist sharpens your positioning and creates a focused search plan.'],
  ['03', 'We search and apply', 'We handpick strong-fit roles and craft each application one at a time.'],
  ['04', 'Review Friday progress', 'You receive a clear weekly report with decisions, applications, and next steps.'],
  ['05', 'Prepare with confidence', 'We coach your interviews, run mock sessions, and help you evaluate offers.'],
]

export function LandingPage() {
  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy reveal">
          <p className="eyebrow">Your personal career concierge</p>
          <h1>We search. We apply. <span>You move forward.</span></h1>
          <p className="hero-lede">A real person manages the details of your job search—from strategy and tailored applications to interview preparation and ongoing support.</p>
          <div className="hero-actions">
            <LinkButton to="/signup">Start your journey <ArrowRight size={18} /></LinkButton>
            <LinkButton to="/how-it-works" variant="secondary">See how it works</LinkButton>
          </div>
          <div className="hero-assurances" aria-label="Service assurances">
            <span><Check size={16} /> Human-led</span>
            <span><Check size={16} /> No mass applying</span>
            <span><Check size={16} /> Pause anytime</span>
          </div>
        </div>
        <div className="founder-stage reveal reveal-delay">
          <div className="founder-arrow" aria-hidden="true">↗</div>
          <img src="/images/headshot.png?v=2" alt="FreshlyForward founder and career strategist" />
          <blockquote>
            <Sparkles size={20} aria-hidden="true" />
            <p>"Your search deserves focus, judgment, and a person who knows your story."</p>
            <footer><strong>Mike Bailey</strong><span>Founder & Career Strategist</span></footer>
          </blockquote>
        </div>
      </section>

      <section className="promise-strip" aria-labelledby="promise-title">
        <div className="shell">
          <SectionHeading eyebrow="Built differently" title="High-touch help for a high-stakes moment." id="promise-title" />
          <div className="promise-grid">
            {promises.map(({ icon: Icon, title, copy }) => (
              <article className="promise-card" key={title}>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="contrast-section shell">
        <div className="contrast-intro">
          <p className="eyebrow eyebrow-light">Quality over volume</p>
          <h2>No AI mass applications. No spray-and-pray search.</h2>
          <p>One carefully chosen opportunity is worth more than a hundred generic submissions. We use technology as a tool—not as a substitute for judgment, care, or accountability.</p>
        </div>
        <div className="contrast-card contrast-muted">
          <span>Mass application services</span>
          {['Hundreds of generic submissions', 'Template-based materials', 'Little context on role selection', 'No person accountable to you'].map((item) => <p key={item}><X size={16} /> {item}</p>)}
        </div>
        <div className="contrast-card contrast-positive">
          <span>The FreshlyForward standard</span>
          {['Opportunities selected for fit', 'Materials tailored by hand', 'A reason behind every application', 'A strategist who knows your story'].map((item) => <p key={item}><Check size={16} /> {item}</p>)}
        </div>
      </section>

      <section className="process-section shell">
        <SectionHeading eyebrow="A clear path" title="Your concierge process" copy="You stay focused on your life and your future. We keep the search moving with care and consistency." />
        <div className="process-grid">
          {steps.map(([number, title, copy], index) => (
            <article className="process-step" key={number}>
              <div className="step-top"><span>{number}</span>{index < steps.length - 1 && <ArrowRight aria-hidden="true" />}</div>
              <h3>{title}</h3><p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="service-preview shell">
        <div className="service-preview-copy">
          <p className="eyebrow">A complete search team, in one person</p>
          <h2>Strategy, execution, and support—working together.</h2>
          <p>FreshlyForward closes the gap between knowing you need a better role and having enough time, energy, and expertise to pursue it well.</p>
          <LinkButton to="/services" variant="secondary">Explore services <ArrowRight size={18} /></LinkButton>
        </div>
        <div className="service-stack">
          <div><Target /><span><strong>Search strategy</strong>Define the right roles, companies, and story.</span></div>
          <div><ClipboardCheck /><span><strong>Application execution</strong>Research, tailor, review, and submit.</span></div>
          <div><UserRoundCheck /><span><strong>Interview readiness</strong>Practice, refine, and build confidence.</span></div>
          <div><Handshake /><span><strong>Ongoing coaching</strong>Navigate decisions, offers, and next moves.</span></div>
        </div>
      </section>

      <ForwardFeedWidget />

      <section className="closing-cta">
        <div className="shell closing-inner">
          <div><p className="eyebrow eyebrow-light">Your next chapter starts here</p><h2>Let's make your job search feel lighter—and work harder.</h2></div>
          <LinkButton to="/signup" variant="light">Meet your strategist <ArrowRight size={18} /></LinkButton>
        </div>
      </section>
    </main>
  )
}
