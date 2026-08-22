import type { ReactNode } from 'react'

type LegalPageProps = { eyebrow: string; title: string; updated: string; children: ReactNode }

export function LegalPage({ eyebrow, title, updated, children }: LegalPageProps) {
  return <main><section className="legal-hero shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>Last updated {updated}</p></section><article className="legal-content shell">{children}</article></main>
}
