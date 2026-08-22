import { Eye, FileHeart, HeartHandshake, PauseCircle, Scale, UserCheck } from 'lucide-react'
import { InteriorPage } from '@/components/InteriorPage'

export function WhyFreshlyForwardPage() {
  return <InteriorPage eyebrow="Why FreshlyForward" title="Because your career is too important for a volume game." intro="The job-search industry often rewards speed and scale. FreshlyForward is built around judgment, trust, transparency, and work that sounds like you." features={[
    { icon: UserCheck, title: 'A person owns the work', copy: 'Your strategist understands your goals and stays accountable to the quality of your search.' },
    { icon: FileHeart, title: 'Your materials stay yours', copy: 'Applications are written around your experience and voice, not generic templates.' },
    { icon: Eye, title: 'The process stays visible', copy: 'You receive a Friday report and context behind every opportunity we pursue.' },
    { icon: Scale, title: 'Fit beats volume', copy: 'We prioritize opportunities worth your time instead of counting submissions.' },
    { icon: HeartHandshake, title: 'Support continues', copy: 'Interview coaching and career guidance stay connected to the search itself.' },
    { icon: PauseCircle, title: 'Flexibility is standard', copy: 'No long-term contracts. Pause when life changes or your search needs a reset.' },
  ]} aside={{ title: 'Human judgment is the product.', copy: 'A job can change your income, confidence, family routine, and future. That deserves more than automation at scale.' }} />
}
