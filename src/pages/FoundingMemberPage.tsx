import { useEffect, useState, type FormEvent } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import {
  getFoundingFeedback,
  createFoundingFeedback,
  getBetaFeatures,
  getSuccessStoryRequests,
} from '@/lib/communication'
import { formatDate, timeAgo, cn } from '@/lib/utils'
import {
  Sparkles, Crown, Gift, Headset, Rocket, Lightbulb, Heart,
  MessageSquare, Bug, ThumbsUp, Send, Loader2, CheckCircle2,
  Clock, Star, Users,
} from 'lucide-react'
import type {
  FoundingMemberFeedback,
  BetaFeature,
  SuccessStoryRequest,
} from '@/types'

const foundingBenefits = [
  { icon: Crown, title: 'Lifetime Founding Pricing', description: 'Your rate is locked in for life — never subject to future price increases.' },
  { icon: Rocket, title: 'Priority Access', description: 'Jump to the front of the line for new features, opportunities, and strategist time.' },
  { icon: Headset, title: 'Direct Career Strategist', description: 'A dedicated, named Career Strategist — no queues, no tickets, just a real person.' },
  { icon: Sparkles, title: 'Early Feature Access', description: 'Be the first to try new tools and capabilities before they launch publicly.' },
  { icon: Lightbulb, title: 'Opportunity To Help Shape FreshlyForward', description: 'Your feedback directly influences our roadmap. Help us build the platform you need.' },
]

const feedbackTypes = [
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb },
  { value: 'bug_report', label: 'Bug Report', icon: Bug },
  { value: 'vote', label: 'Vote on Upcoming Feature', icon: ThumbsUp },
  { value: 'suggestion', label: 'Share a Suggestion', icon: MessageSquare },
] as const

const feedbackStatusLabels: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  declined: 'Declined',
}

const feedbackStatusColors: Record<string, string> = {
  open: 'bg-neutral-100 text-neutral-700',
  under_review: 'bg-accent-100 text-accent-700',
  planned: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-primary-600 text-white',
  completed: 'bg-success-100 text-success-700',
  declined: 'bg-error-100 text-error-700',
}

const betaIconMap: Record<string, typeof Rocket> = {
  Rocket,
  Sparkles,
  Star,
  Lightbulb,
  Crown,
  Gift,
  Heart,
  Users,
}

export function FoundingMemberPage() {
  const { profile } = useAuth()
  const [feedback, setFeedback] = useState<FoundingMemberFeedback[]>([])
  const [betaFeatures, setBetaFeatures] = useState<BetaFeature[]>([])
  const [storyRequests, setStoryRequests] = useState<SuccessStoryRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [feedbackType, setFeedbackType] = useState<string>('feature_request')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!profile) return
    const memberId = profile.id
    Promise.all([
      getFoundingFeedback(memberId),
      getBetaFeatures(),
      getSuccessStoryRequests(memberId),
    ]).then(([fb, beta, stories]) => {
      setFeedback(fb)
      setBetaFeatures(beta)
      setStoryRequests(stories)
      setLoading(false)
    })
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !title.trim()) return
    setSubmitting(true)
    setSuccess(false)
    const created = await createFoundingFeedback({
      member_id: profile.id,
      feedback_type: feedbackType,
      title: title.trim(),
      description: description.trim() || null,
    })
    if (created) {
      setFeedback((prev) => [created, ...prev])
      setTitle('')
      setDescription('')
      setFeedbackType('feature_request')
      setSuccess(true)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Founding Member
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          You're one of the very first members of FreshlyForward. Thank you for believing in us from the start.
        </p>
      </div>

      {/* Founding Member Badge */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-secondary-50 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-sm">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Founding Member
              </span>
              <p className="mt-2 font-serif text-xl font-semibold text-neutral-900">
                Lifetime Founding Rate
              </p>
              {profile?.created_at && (
                <p className="mt-0.5 text-sm text-neutral-600">
                  Member Since {formatDate(profile.created_at)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-sm font-medium text-primary-700">
            <Sparkles className="h-5 w-5" />
            Thank you for being here.
          </div>
        </div>
      </section>

      {/* Founding Benefits */}
      <section className="mb-6" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading" className="mb-4 font-serif text-xl font-semibold text-neutral-900">
          Your Founding Benefits
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {foundingBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
                  <benefit.icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-neutral-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Founding Member Feedback */}
      <section className="mb-6" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading" className="mb-4 font-serif text-xl font-semibold text-neutral-900">
          Founding Member Feedback
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submit form */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h3 className="font-serif text-base font-semibold text-neutral-900">
              Submit Feedback
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Request features, report bugs, vote on upcoming features, or share suggestions.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="feedback-type" className="block text-sm font-medium text-neutral-700">
                  Feedback Type
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                        feedbackType === type.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                      aria-pressed={feedbackType === type.value}
                    >
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="feedback-title" className="block text-sm font-medium text-neutral-700">
                  Title
                </label>
                <input
                  id="feedback-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Brief summary of your feedback"
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="feedback-description" className="block text-sm font-medium text-neutral-700">
                  Details <span className="text-neutral-400">(optional)</span>
                </label>
                <textarea
                  id="feedback-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add any additional context…"
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </button>
              {success && (
                <p className="flex items-center gap-1.5 text-sm text-success-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Thank you! Your feedback has been submitted.
                </p>
              )}
            </form>
          </div>

          {/* Existing feedback list */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h3 className="font-serif text-base font-semibold text-neutral-900">
              Your Submitted Feedback
            </h3>
            {feedback.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                  <MessageSquare className="h-7 w-7 text-neutral-400" />
                </div>
                <p className="mt-4 text-sm text-neutral-500">
                  No feedback submitted yet. Share your first thought!
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                            {feedbackTypes.find((t) => t.value === item.feedback_type)?.label || item.feedback_type}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-medium',
                              feedbackStatusColors[item.status] || 'bg-neutral-100 text-neutral-700'
                            )}
                          >
                            {feedbackStatusLabels[item.status] || item.status}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-neutral-900">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                        )}
                        {item.admin_response && (
                          <div className="mt-2 rounded-lg bg-primary-50 p-3 text-sm text-primary-800">
                            <p className="font-medium">Team response:</p>
                            <p className="mt-0.5">{item.admin_response}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {item.votes} votes
                      </span>
                      <span>{timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Beta Features */}
      <section className="mb-6" aria-labelledby="beta-heading">
        <h2 id="beta-heading" className="mb-4 font-serif text-xl font-semibold text-neutral-900">
          Beta Features
        </h2>
        {betaFeatures.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <Rocket className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">
              No beta features are available right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {betaFeatures.map((feature) => {
              const Icon = betaIconMap[feature.icon] || Sparkles
              return (
                <div
                  key={feature.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50">
                      <Icon className="h-5 w-5 text-secondary-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-neutral-900">
                        {feature.name}
                      </h3>
                      <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700">
                        Beta
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-neutral-600">{feature.description}</p>
                  <p className="mt-3 text-xs text-neutral-400">
                    For: {feature.target_audience}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Referral Program */}
      <section className="mb-6" aria-labelledby="referral-heading">
        <h2 id="referral-heading" className="mb-4 font-serif text-xl font-semibold text-neutral-900">
          Referral Program
        </h2>
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-100">
            <Gift className="h-7 w-7 text-accent-600" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-neutral-900">
            Coming Soon
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            We're building a referral program exclusively for Founding Members. Invite friends,
            earn rewards, and grow the FreshlyForward community together.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-4 py-2 text-sm font-medium text-accent-700">
            <Clock className="h-4 w-4" />
            In Development
          </span>
        </div>
      </section>

      {/* Success Story Requests */}
      <section aria-labelledby="stories-heading">
        <h2 id="stories-heading" className="mb-4 font-serif text-xl font-semibold text-neutral-900">
          Success Story Requests
        </h2>
        {storyRequests.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">
              No success story requests right now. When your strategist has a story worth sharing,
              it'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {storyRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
                      <Heart className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-neutral-900">
                        {req.request_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="mt-0.5 text-sm text-neutral-600">
                        {req.notes || 'Your strategist would love to feature your success story.'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                      req.status === 'pending'
                        ? 'bg-warning-100 text-warning-700'
                        : req.status === 'completed'
                          ? 'bg-success-100 text-success-700'
                          : 'bg-neutral-100 text-neutral-700'
                    )}
                  >
                    {req.status}
                  </span>
                </div>
                {req.member_response && (
                  <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
                    {req.member_response}
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-400">
                  Requested {timeAgo(req.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </MemberLayout>
  )
}
