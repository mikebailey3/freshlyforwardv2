import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ensureProfile, addTimelineEvent } from '@/lib/profile'
import { questionnaireSections } from '@/data/questionnaire'
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome'
import { OnboardingMeetStrategist } from '@/components/onboarding/OnboardingMeetStrategist'
import { OnboardingHowItWorks } from '@/components/onboarding/OnboardingHowItWorks'
import { OnboardingQuestionnaire } from '@/components/onboarding/OnboardingQuestionnaire'
import { OnboardingDocumentUpload } from '@/components/onboarding/OnboardingDocumentUpload'
import { OnboardingConfirmation } from '@/components/onboarding/OnboardingConfirmation'
import { OnboardingDashboardIntro } from '@/components/onboarding/OnboardingDashboardIntro'
import { OnboardingCelebration } from '@/components/onboarding/OnboardingCelebration'
import { Compass, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const onboardingSteps = [
  { key: 'welcome', label: 'Welcome', component: OnboardingWelcome },
  { key: 'meet_strategist', label: 'Meet Your Strategist', component: OnboardingMeetStrategist },
  { key: 'how_it_works', label: 'How It Works', component: OnboardingHowItWorks },
  { key: 'questionnaire', label: 'Questionnaire', component: OnboardingQuestionnaire },
  { key: 'document_upload', label: 'Document Upload', component: OnboardingDocumentUpload },
  { key: 'confirmation', label: 'Membership Confirmation', component: OnboardingConfirmation },
  { key: 'dashboard_intro', label: 'Dashboard Introduction', component: OnboardingDashboardIntro },
  { key: 'celebration', label: 'Completion', component: OnboardingCelebration },
]

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkoutSuccess = searchParams.get('checkout') === 'success'

  const loadProgress = useCallback(async () => {
    if (!user) return

    const { data } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setCompletedSteps(data.completed_steps || [])
      if (data.current_step) {
        const stepIndex = onboardingSteps.findIndex((s) => s.key === data.current_step)
        if (stepIndex >= 0) setCurrentStep(stepIndex)
      }
    } else {
      await supabase.from('onboarding_progress').insert({
        user_id: user.id,
        current_step: 'welcome',
        completed_steps: [],
      })
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) {
      ensureProfile(user.id).then(() => loadProgress())
    }
  }, [user, loadProgress])

  const saveProgress = useCallback(
    async (step: number, completed: string[]) => {
      if (!user) return
      setSaving(true)
      const stepKey = onboardingSteps[step]?.key
      await supabase
        .from('onboarding_progress')
        .update({
          current_step: stepKey,
          completed_steps: completed,
        })
        .eq('user_id', user.id)
      setSaving(false)
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
    },
    [user],
  )

  const handleNext = useCallback(async () => {
    const stepKey = onboardingSteps[currentStep].key
    if (!completedSteps.includes(stepKey)) {
      const updated = [...completedSteps, stepKey]
      setCompletedSteps(updated)
      await saveProgress(currentStep, updated)
    }

    if (currentStep < onboardingSteps.length - 1) {
      const next = currentStep + 1
      setCurrentStep(next)
      await saveProgress(next, completedSteps)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Complete onboarding
      if (user) {
        await supabase
          .from('onboarding_progress')
          .update({ completed_at: new Date().toISOString() })
          .eq('user_id', user.id)

        await supabase
          .from('member_profiles')
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        await addTimelineEvent(user.id, 'onboarding_completed', 'Onboarding Completed', 'You completed the FreshlyForward onboarding.')
        await refreshProfile()
      }
      navigate('/dashboard')
    }
  }, [currentStep, completedSteps, user, navigate, saveProgress, refreshProfile])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const handleSkipToStep = useCallback(
    (stepIndex: number) => {
      setCurrentStep(stepIndex)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const CurrentComponent = onboardingSteps[currentStep].component
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100
  const isLastStep = currentStep === onboardingSteps.length - 1

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary-600" />
            <span className="font-serif text-lg font-semibold text-neutral-900">FreshlyForward</span>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </span>
            )}
            {savedIndicator && (
              <span className="flex items-center gap-1.5 text-xs text-success-600 animate-fade-in">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-neutral-100">
          <div
            className="h-full bg-primary-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Onboarding progress"
          />
        </div>

        {/* Step indicators */}
        <div className="mx-auto max-w-4xl px-4 py-2">
          <div className="hidden items-center justify-between sm:flex">
            {onboardingSteps.map((step, i) => (
              <button
                key={step.key}
                onClick={() => handleSkipToStep(i)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  i === currentStep
                    ? 'text-primary-600'
                    : completedSteps.includes(step.key)
                      ? 'text-success-600'
                      : 'text-neutral-400'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    i === currentStep
                      ? 'bg-primary-600 text-white'
                      : completedSteps.includes(step.key)
                        ? 'bg-success-100 text-success-600'
                        : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {completedSteps.includes(step.key) ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden lg:inline">{step.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between sm:hidden">
            <span className="text-xs font-medium text-primary-600">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
            <span className="text-xs text-neutral-500">{onboardingSteps[currentStep].label}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 pb-32 sm:px-6 sm:pb-24">
        <div key={currentStep} className="animate-fade-in">
          <CurrentComponent
            onNext={handleNext}
            onBack={handleBack}
            profile={profile}
            user={user}
            checkoutSuccess={checkoutSuccess}
          />
        </div>
      </main>

      {/* Sticky Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            {isLastStep ? 'Go to Dashboard' : 'Continue'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
