import { supabase } from '@/lib/supabase'
import { questionnaireSections } from '@/data/questionnaire'
import type { MemberProfile, CareerTimelineEvent } from '@/types'

export async function ensureProfile(userId: string): Promise<MemberProfile | null> {
  const { data: existing } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return existing as MemberProfile

  const { data, error } = await supabase
    .from('member_profiles')
    .insert({ user_id: userId })
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  await addTimelineEvent(userId, 'joined', 'Joined FreshlyForward', 'Welcome to FreshlyForward! Your career journey begins here.')
  await enrollWithRandomStrategist(userId, (data as MemberProfile | null)?.full_name ?? null)

  return data as MemberProfile | null
}

/**
 * Enrolls a brand-new member with a randomly assigned strategist (admins
 * count as strategists). Idempotent on the database side, and safe to
 * no-op silently if no strategists exist yet (fresh install). Also
 * drops a welcome conversation message + notification naming the
 * assigned strategist.
 */
export async function enrollWithRandomStrategist(userId: string, fullName: string | null): Promise<void> {
  const { error } = await supabase.rpc('enroll_member_with_random_strategist', {
    p_member_id: userId,
    p_member_name: fullName,
  })
  if (error) {
    console.error('Error enrolling member with a strategist:', error)
  }
}

export async function addTimelineEvent(
  userId: string,
  eventType: string,
  eventTitle: string,
  eventDescription?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('career_timeline').insert({
    user_id: userId,
    event_type: eventType,
    event_title: eventTitle,
    event_description: eventDescription ?? null,
    metadata: metadata ?? {},
  })

  if (error) {
    console.error('Error adding timeline event:', error)
  }
}

export async function getTimeline(userId: string): Promise<CareerTimelineEvent[]> {
  const { data, error } = await supabase
    .from('career_timeline')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('Error fetching timeline:', error)
    return []
  }

  return (data ?? []) as CareerTimelineEvent[]
}

interface ReadinessCheck {
  field: keyof MemberProfile
  label: string
  weight: number
}

const readinessChecks: ReadinessCheck[] = [
  { field: 'full_name', label: 'Full name', weight: 5 },
  { field: 'phone', label: 'Phone number', weight: 3 },
  { field: 'location', label: 'Location', weight: 5 },
  { field: 'headline', label: 'Professional headline', weight: 5 },
  { field: 'summary', label: 'Career summary', weight: 8 },
  { field: 'employment_history', label: 'Employment history', weight: 15 },
  { field: 'education', label: 'Education', weight: 10 },
  { field: 'skills', label: 'Skills', weight: 10 },
  { field: 'preferred_jobs', label: 'Preferred job titles', weight: 8 },
  { field: 'preferred_industries', label: 'Preferred industries', weight: 5 },
  { field: 'salary_min', label: 'Salary expectations', weight: 5 },
  { field: 'remote_preference', label: 'Remote preference', weight: 4 },
  { field: 'schedule_preference', label: 'Schedule preference', weight: 3 },
  { field: 'work_style', label: 'Work style', weight: 4 },
  { field: 'career_goals', label: 'Career goals', weight: 5 },
  { field: 'strengths', label: 'Strengths', weight: 3 },
  { field: 'motivators', label: 'What motivates you', weight: 3 },
  { field: 'application_authorized', label: 'Application authorization', weight: 2 },
  { field: 'electronic_consent', label: 'Electronic consent', weight: 2 },
]

export function calculateSearchReadiness(profile: MemberProfile): {
  score: number
  missing: { field: string; label: string }[]
} {
  let earned = 0
  let total = 0
  const missing: { field: string; label: string }[] = []

  for (const check of readinessChecks) {
    total += check.weight
    const value = profile[check.field]
    let isComplete = false

    if (typeof value === 'boolean') {
      isComplete = value === true
    } else if (Array.isArray(value)) {
      isComplete = value.length > 0
    } else if (typeof value === 'number') {
      isComplete = value > 0
    } else {
      isComplete = !!value && String(value).trim().length > 0
    }

    if (isComplete) {
      earned += check.weight
    } else {
      missing.push({ field: check.field, label: check.label })
    }
  }

  return {
    score: Math.round((earned / total) * 100),
    missing,
  }
}

/**
 * Finds which questionnaire/profile-edit section a given member_profiles
 * column belongs to, so the "Let's fix it" flow can deep-link straight
 * into the right part of the editable profile.
 */
export function getSectionKeyForField(field: string): string | null {
  for (const section of questionnaireSections) {
    if (section.fields.some((f) => f.key === field)) {
      return section.key
    }
  }
  return null
}

/**
 * Builds the URL for the "Let's fix it" call-to-action on the Search
 * Readiness widget — jumps into edit mode on the Career Profile page,
 * focused on the section containing the first incomplete field.
 */
export function getReadinessFixLink(missing: { field: string; label: string }[]): string {
  const firstMissing = missing[0]
  const section = firstMissing ? getSectionKeyForField(firstMissing.field) : null
  return section ? `/profile?edit=1&focus=${section}` : '/profile?edit=1'
}
