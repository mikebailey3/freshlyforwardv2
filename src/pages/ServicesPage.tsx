import { BriefcaseBusiness, FilePenLine, MessagesSquare, Search, Target, UserCheck } from 'lucide-react'
import { InteriorPage } from '@/components/InteriorPage'

export function ServicesPage() {
  return <InteriorPage eyebrow="Services" title="Everything your job search needs. Personally handled." intro="Choose focused support or a complete concierge partnership. Either way, the work stays thoughtful, personal, and human-led." features={[
    { icon: Target, title: 'Career search strategy', copy: 'Clarify your direction, target roles, positioning, and practical search plan.' },
    { icon: FilePenLine, title: 'Resume & profile optimization', copy: 'Strengthen your story across your resume, LinkedIn profile, and core materials.' },
    { icon: Search, title: 'Opportunity research', copy: 'Receive hand-selected roles reviewed for fit, growth, and your priorities.' },
    { icon: BriefcaseBusiness, title: 'Application concierge', copy: 'We tailor materials, complete applications, and keep the details moving.' },
    { icon: UserCheck, title: 'Interview preparation', copy: 'Practice real questions, strengthen your stories, and build calm confidence.' },
    { icon: MessagesSquare, title: 'Career coaching', copy: 'Get an experienced sounding board for decisions, offers, setbacks, and next moves.' },
  ]} aside={{ title: 'No AI mass applications—ever.', copy: 'Technology can support research and organization. The judgment, writing, decisions, and accountability remain human.' }} />
}
