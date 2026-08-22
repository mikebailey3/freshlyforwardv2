import { Search, FileText, Mail, Calendar, MessageSquare, Compass } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onBack: () => void
}

export function OnboardingHowItWorks({ onNext }: OnboardingStepProps) {
  const steps = [
    {
      icon: Compass,
      title: '1. We Learn About You',
      desc: 'Your Strategist reviews your questionnaire, resume, and career goals to build a personalized strategy.',
    },
    {
      icon: Search,
      title: '2. Hand-Selected Opportunities',
      desc: 'Your Strategist personally researches and hand-selects opportunities that match your preferences.',
    },
    {
      icon: FileText,
      title: '3. Hand-Crafted Applications',
      desc: 'Each application is personally written and submitted by your Strategist — never automated or AI-generated.',
    },
    {
      icon: Mail,
      title: '4. Weekly Friday Report',
      desc: 'Every Friday, you receive a progress report with what was done, what is next, and key updates.',
    },
    {
      icon: MessageSquare,
      title: '5. Direct Communication',
      desc: 'Message your Strategist anytime with questions, updates, or new ideas.',
    },
    {
      icon: Calendar,
      title: '6. Ongoing Strategy',
      desc: 'Regular strategy reviews keep your search on track and adapt to new opportunities.',
    },
  ]

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        How FreshlyForward Works
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        A simple, human-led process designed around you — not a database.
      </p>

      <div className="mt-10 space-y-4">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <step.icon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-base font-semibold text-neutral-900">{step.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-primary-50 border border-primary-100 p-5 text-center">
        <p className="text-sm text-primary-700">
          <strong>Quality over quantity.</strong> We do not focus on application volume. We focus on finding the right
          opportunities and crafting applications that stand out.
        </p>
      </div>
    </div>
  )
}
