import { Compass, Sparkles } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onBack: () => void
}

export function OnboardingWelcome({ onNext }: OnboardingStepProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
        <Compass className="h-10 w-10 text-primary-600" />
      </div>
      <h1 className="font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Welcome to FreshlyForward
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
        We are so glad you are here. Over the next few minutes, we will walk you through everything you need to get
        started with your personal Career Strategist.
      </p>

      <div className="mx-auto mt-12 max-w-2xl space-y-4 text-left">
        {[
          { icon: Sparkles, title: 'Personalized from day one', desc: 'Your Career Strategist will get to know you, your goals, and your preferences.' },
          { icon: Compass, title: 'Human-led, not automated', desc: 'Every step is guided by a real person who cares about your career success.' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <item.icon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-neutral-900">{item.title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        This should take about 10-15 minutes. You can save and come back anytime.
      </p>
    </div>
  )
}
