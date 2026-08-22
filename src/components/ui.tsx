import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type LinkButtonProps = {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'light'
}

export function LinkButton({ to, children, variant = 'primary' }: LinkButtonProps) {
  return <Link to={to} className={`button button-${variant}`}>{children}</Link>
}

type SectionHeadingProps = {
  eyebrow: string
  title: string
  copy?: string
  id?: string
  centered?: boolean
}

export function SectionHeading({ eyebrow, title, copy, id, centered = false }: SectionHeadingProps) {
  return (
    <div className={`section-heading${centered ? ' section-heading-centered' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}
