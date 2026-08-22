import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Check } from 'lucide-react'
import { LinkButton, SectionHeading } from './ui'

export type Feature = {
  icon: LucideIcon
  title: string
  copy: string
  bullets?: string[]
}

type InteriorPageProps = {
  eyebrow: string
  title: string
  intro: string
  features: Feature[]
  sectionEyebrow?: string
  sectionTitle?: string
  aside?: { title: string; copy: string }
}

export function InteriorPage({ eyebrow, title, intro, features, sectionEyebrow = 'What to expect', sectionTitle = 'Support designed around your next move.', aside }: InteriorPageProps) {
  return (
    <main>
      <section className="page-hero shell">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p><div className="hero-actions"><LinkButton to="/signup">Start your journey <ArrowRight size={18} /></LinkButton><LinkButton to="/contact" variant="secondary">Talk with us</LinkButton></div></div>
        <div className="page-hero-mark" aria-hidden="true"><span>FF</span><ArrowRight /></div>
      </section>
      <section className="interior-section shell">
        <SectionHeading eyebrow={sectionEyebrow} title={sectionTitle} />
        <div className="feature-grid">
          {features.map(({ icon: Icon, title: featureTitle, copy, bullets }) => (
            <article className="feature-card" key={featureTitle}>
              <Icon aria-hidden="true" /><h2>{featureTitle}</h2><p>{copy}</p>
              {bullets && <ul>{bullets.map((bullet) => <li key={bullet}><Check size={15} />{bullet}</li>)}</ul>}
            </article>
          ))}
        </div>
      </section>
      {aside && <section className="editorial-aside shell"><p className="eyebrow eyebrow-light">The human difference</p><h2>{aside.title}</h2><p>{aside.copy}</p><LinkButton to="/why-freshlyforward" variant="light">Why FreshlyForward <ArrowRight size={18} /></LinkButton></section>}
    </main>
  )
}
