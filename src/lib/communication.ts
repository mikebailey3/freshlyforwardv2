import { supabase } from '@/lib/supabase'
import { addTimelineEvent } from '@/lib/profile'
import type {
  FoundingMemberFeedback, BetaFeature, SuccessStoryRequest,
  Notification, CommunicationPreferences, ActivityFeedItem,
  CalendarEvent, InterviewPrep, InterviewFeedback,
} from '@/types'

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Notification[]
}

export async function createNotification(data: Partial<Notification>): Promise<void> {
  const { error } = await supabase.from('notifications').insert(data)
  if (error) console.error('Error creating notification:', error)
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) console.error('Error marking notification:', error)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
  if (error) console.error('Error marking all notifications:', error)
}

// ============================================================
// ACTIVITY FEED
// ============================================================
export async function addActivity(data: Partial<ActivityFeedItem>): Promise<void> {
  const { error } = await supabase.from('activity_feed').insert(data)
  if (error) console.error('Error adding activity:', error)
}

export async function getActivityFeed(userId: string): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []) as ActivityFeedItem[]
}

// ============================================================
// COMMUNICATION PREFERENCES
// ============================================================
export async function getCommPrefs(userId: string): Promise<CommunicationPreferences | null> {
  const { data, error } = await supabase
    .from('communication_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  return data as CommunicationPreferences | null
}

export async function ensureCommPrefs(userId: string): Promise<CommunicationPreferences | null> {
  const existing = await getCommPrefs(userId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('communication_preferences')
    .insert({ user_id: userId })
    .select('*')
    .maybeSingle()
  if (error) return null
  return data as CommunicationPreferences | null
}

export async function updateCommPrefs(userId: string, data: Partial<CommunicationPreferences>): Promise<void> {
  const { error } = await supabase
    .from('communication_preferences')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) console.error('Error updating comm prefs:', error)
}

// ============================================================
// CALENDAR EVENTS
// ============================================================
export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('start_at', { ascending: true })
  if (error) return []
  return (data ?? []) as CalendarEvent[]
}

export async function createCalendarEvent(data: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const { data: result, error } = await supabase
    .from('calendar_events')
    .insert(data)
    .select('*')
    .maybeSingle()
  if (error) return null
  return result as CalendarEvent | null
}

// ============================================================
// FOUNDING MEMBER FEEDBACK
// ============================================================
export async function getFoundingFeedback(memberId: string): Promise<FoundingMemberFeedback[]> {
  const { data, error } = await supabase
    .from('founding_member_feedback')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as FoundingMemberFeedback[]
}

export async function createFoundingFeedback(data: Partial<FoundingMemberFeedback>): Promise<FoundingMemberFeedback | null> {
  const { data: result, error } = await supabase
    .from('founding_member_feedback')
    .insert(data)
    .select('*')
    .maybeSingle()
  if (error) return null
  return result as FoundingMemberFeedback | null
}

// ============================================================
// BETA FEATURES
// ============================================================
export async function getBetaFeatures(): Promise<BetaFeature[]> {
  const { data, error } = await supabase
    .from('beta_features')
    .select('*')
    .eq('is_enabled', true)
    .order('sort_order')
  if (error) return []
  return (data ?? []) as BetaFeature[]
}

// ============================================================
// SUCCESS STORY REQUESTS
// ============================================================
export async function getSuccessStoryRequests(memberId: string): Promise<SuccessStoryRequest[]> {
  const { data, error } = await supabase
    .from('success_story_requests')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as SuccessStoryRequest[]
}

export async function createSuccessStoryRequest(data: Partial<SuccessStoryRequest>): Promise<SuccessStoryRequest | null> {
  const { data: result, error } = await supabase
    .from('success_story_requests')
    .insert(data)
    .select('*')
    .maybeSingle()
  if (error) return null
  return result as SuccessStoryRequest | null
}

export async function updateSuccessStoryRequest(id: string, data: Partial<SuccessStoryRequest>): Promise<void> {
  const { error } = await supabase
    .from('success_story_requests')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error('Error updating success story request:', error)
}

// ============================================================
// INTERVIEW PREP
// ============================================================
export async function getInterviewPrep(memberId: string): Promise<InterviewPrep[]> {
  const { data, error } = await supabase
    .from('interview_prep')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as InterviewPrep[]
}

export async function createInterviewPrep(data: Partial<InterviewPrep>): Promise<InterviewPrep | null> {
  const { data: result, error } = await supabase
    .from('interview_prep')
    .insert(data)
    .select('*')
    .maybeSingle()
  if (error) return null
  return result as InterviewPrep | null
}

export async function updateInterviewPrep(id: string, data: Partial<InterviewPrep>): Promise<void> {
  const { error } = await supabase
    .from('interview_prep')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error('Error updating interview prep:', error)
}

// ============================================================
// INTERVIEW FEEDBACK
// ============================================================
export async function getInterviewFeedback(mockInterviewId: string): Promise<InterviewFeedback | null> {
  const { data, error } = await supabase
    .from('interview_feedback')
    .select('*')
    .eq('mock_interview_id', mockInterviewId)
    .maybeSingle()
  if (error) return null
  return data as InterviewFeedback | null
}

export async function createInterviewFeedback(data: Partial<InterviewFeedback>): Promise<InterviewFeedback | null> {
  const { data: result, error } = await supabase
    .from('interview_feedback')
    .insert(data)
    .select('*')
    .maybeSingle()
  if (error) return null
  return result as InterviewFeedback | null
}

export async function updateInterviewFeedback(id: string, data: Partial<InterviewFeedback>): Promise<void> {
  const { error } = await supabase
    .from('interview_feedback')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error('Error updating interview feedback:', error)
}

// ============================================================
// FRIDAY REPORTS
// ============================================================
export async function getFridayReports(memberId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('friday_reports')
    .select('*')
    .eq('user_id', memberId)
    .order('report_date', { ascending: false })
  if (error) return []
  return (data ?? []) as Record<string, unknown>[]
}

export async function createFridayReport(data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const { data: result, error } = await supabase
    .from('friday_reports')
    .insert(data)
    .select('*')
    .maybeSingle()
  if (error) return null
  return result
}

export async function updateFridayReport(id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('friday_reports').update(data).eq('id', id)
  if (error) console.error('Error updating report:', error)
}

// ============================================================
// STRATEGIST REMINDERS
// ============================================================
export async function getStrategistReminders(strategistId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('strategist_reminders')
    .select('*')
    .eq('strategist_id', strategistId)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Record<string, unknown>[]
}

export async function createStrategistReminder(data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('strategist_reminders').insert(data)
  if (error) console.error('Error creating reminder:', error)
}

export async function dismissStrategistReminder(id: string): Promise<void> {
  const { error } = await supabase.from('strategist_reminders').update({ is_dismissed: true }).eq('id', id)
  if (error) console.error('Error dismissing reminder:', error)
}
