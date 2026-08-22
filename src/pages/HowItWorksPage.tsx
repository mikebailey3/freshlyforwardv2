import { CalendarDays, FileCheck2, Flag, MessagesSquare, SearchCheck, UserRoundSearch } from 'lucide-react'
import { InteriorPage } from '@/components/InteriorPage'

export function HowItWorksPage() {
  return <InteriorPage eyebrow="How it works" title="A thoughtful search, managed from first conversation to first day." intro="FreshlyForward combines strategy, hands-on execution, weekly visibility, and interview coaching in one continuous partnership." sectionEyebrow="The concierge process" sectionTitle="Clear steps. Consistent momentum. No black box." features={[
    { icon: UserRoundSearch, title: '1. We learn your story', copy: 'Your goals and experience shape the search—not a keyword list.', bullets: ['Career history and strengths', 'Role and company preferences', 'Compensation and lifestyle goals'] },
    { icon: Flag, title: '2. We set the strategy', copy: 'We clarify your positioning and build the roadmap for a focused search.', bullets: ['Target role definition', 'Resume and LinkedIn direction', 'Search priorities and guardrails'] },
    { icon: SearchCheck, title: '3. We handpick roles', copy: 'Each opportunity is reviewed by a person for fit and forward potential.', bullets: ['Role and company research', 'Fit assessment', 'A clear "why this role" rationale'] },
    { icon: FileCheck2, title: '4. We craft and apply', copy: 'We tailor your materials and submit with your explicit authorization.', bullets: ['Resume alignment', 'Custom cover letters', 'Careful application review'] },
    { icon: CalendarDays, title: '5. We report every Friday', copy: 'Your weekly progress arrives in plain language, with no mystery.', bullets: ['Applications and status', 'Search insights', 'Next-week priorities'] },
    { icon: MessagesSquare, title: '6. We prepare and coach', copy: 'When interviews arrive, we practice together and navigate what follows.', bullets: ['Mock interviews', 'Decision and offer support', 'Ongoing career coaching'] },
  ]} aside={{ title: 'You always know what is happening and why.', copy: 'Every role has a rationale. Every application reflects your story. Every Friday brings a clear progress report.' }} />
}
