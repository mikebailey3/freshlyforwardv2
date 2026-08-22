import { useEffect, useMemo, useState } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { CircularProgress } from '@/components/CircularProgress'
import { useAuth } from '@/context/AuthContext'
import { getLinkedInProfile, syncLinkedInProfile } from '@/lib/linkedinProfile'
import { computeLinkedInScore } from '@/lib/linkedinOptimizer'
import type { SectionResult } from '@/lib/linkedinOptimizer'
import { timeAgo } from '@/lib/utils'
import {
  Linkedin, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb, Info,
} from 'lucide-react'
import type { LinkedInProfileData } from '@/types'

interface FormState {
  linkedinUrl: string
  targetRole: string
  headline: string
  about: string
  experienceBullets: string
  skillsInput: string
}

const EMPTY_FORM: FormState = {
  linkedinUrl: '', targetRole: '', headline: '', about: '', experienceBullets: '', skillsInput: '',
}

function toFormState(profile: LinkedInProfileData): FormState {
  return {
    linkedinUrl: profile.linkedin_url || '',
    targetRole: profile.target_role || '',
    headline: profile.headline,
    about: profile.about,
    experienceBullets: profile.experience_bullets,
    skillsInput: profile.skills.join(', '),
  }
}

function scoreBand(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Strong', className: 'text-success-600' }
  if (score >= 50) return { label: 'Needs Work', className: 'text-warning-600' }
  return { label: 'Weak', className: 'text-error-600' }
}

function SectionCard({ title, result }: { title: string; result: SectionResult }) {
  const pct = result.maxPoints > 0 ? Math.round((result.points / result.maxPoints) * 100) : 0
  const strong = pct >= 80

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-neutral-900">{title}</h3>
        <span className={`text-sm font-bold ${strong ? 'text-success-600' : pct >= 50 ? 'text-warning-600' : 'text-error-600'}`}>
          {result.points}/{result.maxPoints}
        </span>
      </div>

      {result.issues.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Looking sharp — no issues found here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {result.issues.map((issue, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-500" />
              {issue}
            </li>
          ))}
        </ul>
      )}

      {result.suggestion && (
        <div className="mt-3 flex gap-2 rounded-lg bg-primary-50 p-3 text-sm text-primary-800">
          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
          <span>{result.suggestion}</span>
        </div>
      )}
    </div>
  )
}

export function LinkedInOptimizerPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<LinkedInProfileData | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getLinkedInProfile(user.id).then((data) => {
      if (data) {
        setProfile(data)
        setForm(toFormState(data))
      }
      setLoading(false)
    })
  }, [user])

  const result = useMemo(() => {
    if (!profile) return null
    return computeLinkedInScore(profile)
  }, [profile])

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSync = async () => {
    if (!user) return
    setSaving(true)
    setError(null)

    const skills = form.skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
    const updated = await syncLinkedInProfile(user.id, {
      linkedin_url: form.linkedinUrl.trim() || null,
      target_role: form.targetRole.trim() || null,
      headline: form.headline.trim(),
      about: form.about.trim(),
      experience_bullets: form.experienceBullets,
      skills,
    })

    if (updated) {
      setProfile(updated)
      setForm(toFormState(updated))
    } else {
      setError('Something went wrong saving your profile. Please try again.')
    }
    setSaving(false)
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

  const band = result ? scoreBand(result.score) : null

  return (
    <MemberLayout>
      <div className="mb-6 flex items-center gap-2">
        <Linkedin className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">LinkedIn Optimizer</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Score your LinkedIn profile copy and get concrete rewrite suggestions.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          LinkedIn doesn't allow apps to auto-import profile data (their API doesn't grant that access,
          and scraping profiles violates their Terms of Service). Paste your current Headline, About,
          Experience bullets, and Skills below, and hit <strong>Analyze &amp; Sync</strong> any time you
          want a fresh, honest check.
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={handleChange('linkedinUrl')}
                  placeholder="https://linkedin.com/in/yourname"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Target Role</label>
                <input
                  type="text"
                  value={form.targetRole}
                  onChange={handleChange('targetRole')}
                  placeholder="e.g. Senior Operations Manager"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Headline</label>
              <input
                type="text"
                value={form.headline}
                onChange={handleChange('headline')}
                placeholder="Paste your current LinkedIn headline"
                maxLength={220}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">About</label>
              <textarea
                value={form.about}
                onChange={handleChange('about')}
                rows={6}
                placeholder="Paste your current LinkedIn About section"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Experience Bullets <span className="font-normal text-neutral-400">(one per line)</span>
              </label>
              <textarea
                value={form.experienceBullets}
                onChange={handleChange('experienceBullets')}
                rows={6}
                placeholder={'Responsible for managing a team of 5...\nLed a project that improved efficiency...'}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Skills <span className="font-normal text-neutral-400">(comma-separated)</span>
              </label>
              <textarea
                value={form.skillsInput}
                onChange={handleChange('skillsInput')}
                rows={2}
                placeholder="Project Management, Customer Service, Excel, Leadership"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-neutral-400">
                {profile?.last_synced_at ? `Last synced ${timeAgo(profile.last_synced_at)}` : 'Never synced yet'}
              </p>
              <button
                onClick={handleSync}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Analyze &amp; Sync
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-6">
                <CircularProgress value={result.score} size={140} label="Professional Score" />
                {band && <span className={`text-sm font-semibold ${band.className}`}>{band.label}</span>}
              </div>
              <SectionCard title="Headline" result={result.headline} />
              <SectionCard title="About" result={result.about} />
              <SectionCard title="Experience" result={result.experience} />
              <SectionCard title="Skills" result={result.skills} />
            </>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <Linkedin className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-4 text-sm text-neutral-500">
                Fill out the form and click Analyze &amp; Sync to get your Professional Score.
              </p>
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  )
}
