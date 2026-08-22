import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, PartyPopper } from 'lucide-react'

interface OnboardingStepProps {
  onNext: () => void
  onBack: () => void
}

export function OnboardingCelebration({ onNext }: OnboardingStepProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-secondary-100">
        <PartyPopper className="h-10 w-10 text-primary-600" />
      </div>

      <h1 className="font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        You are all set!
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
        Congratulations! You have completed onboarding. Your Career Strategist is reviewing your questionnaire
        and will begin building your personalized career plan.
      </p>

      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-center gap-2 text-primary-600">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold">What happens next?</span>
        </div>
        <ul className="mt-4 space-y-3 text-left text-sm text-neutral-600">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
            Your Career Strategist reviews your questionnaire and resume.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
            You receive a welcome message with your initial strategy.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
            Your Strategist begins researching hand-selected opportunities.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
            Your first Friday Progress Report arrives at the end of the week.
          </li>
        </ul>
      </div>

      <button
        onClick={onNext}
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700"
      >
        Go to Your Dashboard
        <ArrowRight className="h-5 w-5" />
      </button>

      <p className="mt-6 text-sm text-neutral-500">
        You can always update your profile or questionnaire from your dashboard.
      </p>
    </div>
  )
}
