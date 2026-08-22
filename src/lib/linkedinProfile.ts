import { supabase } from '@/lib/supabase'
import type { LinkedInProfileData } from '@/types'

// ============================================================
// LINKEDIN PROFILE (member's own pasted-in copy of their profile)
// ============================================================

export async function getLinkedInProfile(memberId: string): Promise<LinkedInProfileData | null> {
  const { data, error } = await supabase
    .from('linkedin_profiles')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching LinkedIn profile:', error)
    return null
  }

  return data as LinkedInProfileData | null
}

export interface LinkedInProfileInput {
  linkedin_url: string | null
  target_role: string | null
  headline: string
  about: string
  experience_bullets: string
  skills: string[]
}

/**
 * Upserts the member's pasted-in profile content and stamps
 * `last_synced_at` -- this timestamp IS the "sync": there is no live
 * connection to LinkedIn, just a record of when the member last refreshed
 * their copy here. See the linkedin_optimizer migration for why.
 */
export async function syncLinkedInProfile(
  memberId: string,
  input: LinkedInProfileInput,
): Promise<LinkedInProfileData | null> {
  const { data, error } = await supabase
    .from('linkedin_profiles')
    .upsert(
      { member_id: memberId, ...input, last_synced_at: new Date().toISOString() },
      { onConflict: 'member_id' },
    )
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error syncing LinkedIn profile:', error)
    return null
  }

  return data as LinkedInProfileData | null
}
