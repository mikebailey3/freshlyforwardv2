import { LinkButton } from '@/components/ui'

const questions: [string, string][] = [
  ['Is FreshlyForward an AI application service?', 'No. FreshlyForward is a human-led career concierge. Technology may support organization and research, but people select opportunities, shape strategy, craft materials, and remain accountable for the work.'],
  ['Do you apply without my permission?', 'No. Your application authorization is documented before applications begin, and you can update or withdraw it. We also follow the role preferences and boundaries established with your strategist.'],
  ['How many jobs do you apply to each week?', 'We do not promise a volume target because fit comes first. Your Friday report explains the opportunities selected, applications completed, search findings, and next steps.'],
  ['What arrives in the Friday report?', 'Your report includes roles reviewed, applications submitted, current statuses, key search insights, and priorities for the following week.'],
  ['Can you guarantee I get hired?', 'No ethical service can guarantee a hiring outcome. FreshlyForward provides the strategy, execution, preparation, and support that help you run a stronger search.'],
  ['Can I pause or cancel?', 'Yes. Concierge service has no long-term contract and can be paused before the next monthly renewal.'],
  ['Do you help with interviews?', 'Yes. Interview preparation can include role research, answer development, mock interviews, feedback, follow-up strategy, and offer decision support.'],
  ['Who is this service best for?', 'FreshlyForward is designed for busy professionals, career changers, people returning to work, and job seekers who want a more personal and accountable search partner.'],
]

export function FaqPage() {
  return <main><section className="page-hero page-hero-centered shell"><div><p className="eyebrow">Frequently asked questions</p><h1>Clarity before commitment.</h1><p>Understand the service, the boundaries, and what human-led support really means.</p></div></section><section className="faq-list shell">{questions.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section><section className="small-cta shell"><div><h2>Still have a question?</h2><p>Send it directly to a FreshlyForward strategist.</p></div><LinkButton to="/contact">Contact us</LinkButton></section></main>
}
