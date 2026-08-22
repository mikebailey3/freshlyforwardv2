import { supabase } from '@/lib/supabase'
import type { FridayReport } from '@/types'

// ============================================================
// FRIDAY REPORT WORKFLOW
//
// Draft (strategist writing) -> Pending Review (submitted to admin) ->
// Approved (admin signed off) -> Sent (member can now see it + notified).
//
// IMPORTANT: nothing here auto-sends on a schedule. A report only becomes
// visible to the member (and only triggers a notification) when an admin
// explicitly calls sendFridayReport. There's no real email provider wired
// into this app (no SendGrid/Resend/etc) -- "sent" means "posted in-app +
// notified"; hooking up actual email delivery is a separate integration.
// ============================================================

export async function getReportsForStrategist(strategistId: string): Promise<FridayReport[]> {
  const { data: assignments } = await supabase
    .from('strategist_assignments')
    .select('member_id')
    .eq('strategist_id', strategistId)
    .eq('is_active', true)
  const memberIds = (assignments ?? []).map((a) => a.member_id as string)
  if (memberIds.length === 0) return []

  const { data, error } = await supabase
    .from('friday_reports')
    .select('*')
    .in('user_id', memberIds)
    .order('report_date', { ascending: false })
  if (error) {
    console.error('Error loading strategist reports:', error)
    return []
  }
  return (data ?? []) as FridayReport[]
}

export async function getReportsPendingReview(): Promise<FridayReport[]> {
  const { data, error } = await supabase
    .from('friday_reports')
    .select('*')
    .eq('approval_status', 'pending_review')
    .order('report_date', { ascending: true })
  if (error) {
    console.error('Error loading pending reports:', error)
    return []
  }
  return (data ?? []) as FridayReport[]
}

export async function createDraftReport(data: Partial<FridayReport>): Promise<FridayReport | null> {
  const { data: result, error } = await supabase
    .from('friday_reports')
    .insert({ ...data, approval_status: 'draft' })
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('Error creating report draft:', error)
    return null
  }
  return result as FridayReport
}

export async function updateReport(id: string, data: Partial<FridayReport>): Promise<void> {
  const { error } = await supabase.from('friday_reports').update(data).eq('id', id)
  if (error) console.error('Error updating report:', error)
}

export async function submitReportForReview(id: string): Promise<void> {
  await updateReport(id, { approval_status: 'pending_review' })
}

export async function requestReportChanges(id: string, adminId: string, notes: string): Promise<void> {
  await updateReport(id, { approval_status: 'draft' })
  await supabase.from('report_approvals').insert({
    report_id: id,
    admin_id: adminId,
    status: 'changes_requested',
    notes,
  })
}

export async function approveReport(id: string, adminId: string): Promise<void> {
  await updateReport(id, {
    approval_status: 'approved',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  })
  await supabase.from('report_approvals').insert({
    report_id: id,
    admin_id: adminId,
    status: 'approved',
    approved_at: new Date().toISOString(),
  })
}

// Marks the report sent and notifies the member. Admin-only in the UI, but
// RLS-wise this is a plain update (strategist/admin already have UPDATE
// rights on friday_reports) plus a notification insert. Since the member
// owns their own notifications row, auth.uid() = user_id passes RLS fine
// as long as the report's user_id matches -- no SECURITY DEFINER needed
// here because we're the ones inserting a notification FOR the member,
// which the admin/strategist cannot do directly (RLS blocks cross-user
// notification inserts). We route it through the member's own insert
// policy by having the report owner already exist; instead we rely on the
// existing enroll pattern: use a SECURITY DEFINER RPC.
export async function sendFridayReport(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('send_friday_report', { p_report_id: id })
  if (error) {
    console.error('Error sending report:', error)
    return { error: error.message }
  }
  return { error: null }
}

interface ReportDraftData {
  opportunitiesReviewed: number
  applicationsSubmitted: number
  interviewsScheduled: number
  opportunitiesResearched: string
  applicationsSubmittedDetail: string
  interviewsDetail: string
}

// Pulls real activity for a member within a date range so a strategist can
// generate an accurate draft instead of typing numbers from memory.
export async function generateReportDraftData(
  memberId: string,
  periodStart: string,
  periodEnd: string
): Promise<ReportDraftData> {
  const [oppsRes, appsRes, interviewsRes] = await Promise.all([
    supabase
      .from('opportunities')
      .select('employer, job_title, created_at')
      .eq('member_id', memberId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd),
    supabase
      .from('applications')
      .select('employer, job_title, date_submitted')
      .eq('member_id', memberId)
      .not('date_submitted', 'is', null)
      .gte('date_submitted', periodStart)
      .lte('date_submitted', periodEnd),
    supabase
      .from('applications')
      .select('employer, job_title, interview_date')
      .eq('member_id', memberId)
      .not('interview_date', 'is', null)
      .gte('interview_date', periodStart)
      .lte('interview_date', periodEnd),
  ])

  const opps = oppsRes.data ?? []
  const apps = appsRes.data ?? []
  const interviews = interviewsRes.data ?? []

  return {
    opportunitiesReviewed: opps.length,
    applicationsSubmitted: apps.length,
    interviewsScheduled: interviews.length,
    opportunitiesResearched: opps.map((o) => `${o.job_title} at ${o.employer}`).join('\n') || 'None this period.',
    applicationsSubmittedDetail: apps.map((a) => `${a.job_title} at ${a.employer}`).join('\n') || 'None this period.',
    interviewsDetail: interviews.map((i) => `${i.job_title} at ${i.employer}`).join('\n') || 'None this period.',
  }
}
