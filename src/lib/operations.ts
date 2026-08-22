import { supabase } from '@/lib/supabase'
import { addTimelineEvent } from '@/lib/profile'
import type {
  Opportunity, Application, ResumeVersion, CoverLetter,
  CareerNote, FollowUp, MemberFeedback, WhyWeApplied, EligibleStrategist,
} from '@/types'

// ============================================================
// OPPORTUNITIES
// ============================================================

export async function createOpportunity(data: Partial<Opportunity>): Promise<Opportunity | null> {
  const { data: result, error } = await supabase
    .from('opportunities')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating opportunity:', error)
    return null
  }

  if (result) {
    await addTimelineEvent(
      result.member_id,
      'opportunity_added',
      'Opportunity Added',
      `${result.job_title} at ${result.employer}`,
    )
  }

  return result as Opportunity | null
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<void> {
  const { error } = await supabase
    .from('opportunities')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating opportunity:', error)

  // Add timeline events for status changes
  if (data.status === 'approved') {
    const { data: opp } = await supabase.from('opportunities').select('member_id, job_title, employer').eq('id', id).maybeSingle()
    if (opp) {
      await addTimelineEvent(opp.member_id, 'opportunity_approved', 'Opportunity Approved', `${opp.job_title} at ${opp.employer}`)
    }
  }
}

export async function getOpportunities(memberId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching opportunities:', error)
    return []
  }

  return (data ?? []) as Opportunity[]
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching opportunity:', error)
    return null
  }

  return data as Opportunity | null
}

// ============================================================
// APPLICATIONS
// ============================================================

export async function createApplication(data: Partial<Application>): Promise<Application | null> {
  const { data: result, error } = await supabase
    .from('applications')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating application:', error)
    return null
  }

  return result as Application | null
}

export async function updateApplication(id: string, data: Partial<Application>): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating application:', error)

  // Timeline events for key status changes
  if (data.status === 'submitted') {
    const { data: app } = await supabase.from('applications').select('member_id, job_title, employer').eq('id', id).maybeSingle()
    if (app) {
      await addTimelineEvent(app.member_id, 'application_submitted', 'Application Submitted', `${app.job_title} at ${app.employer}`)
      await createWhyWeApplied(id)
    }
  }

  if (data.status === 'interview_scheduled') {
    const { data: app } = await supabase.from('applications').select('member_id, job_title, employer').eq('id', id).maybeSingle()
    if (app) {
      await addTimelineEvent(app.member_id, 'interview_scheduled', 'Interview Scheduled', `${app.job_title} at ${app.employer}`)
    }
  }

  if (data.status === 'offer_received') {
    const { data: app } = await supabase.from('applications').select('member_id, job_title, employer').eq('id', id).maybeSingle()
    if (app) {
      await addTimelineEvent(app.member_id, 'offer_received', 'Offer Received', `${app.job_title} at ${app.employer}`)
    }
  }
}

export async function getApplications(memberId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
    return []
  }

  return (data ?? []) as Application[]
}

// ============================================================
// WHY WE APPLIED
// ============================================================

export async function createWhyWeApplied(applicationId: string): Promise<WhyWeApplied | null> {
  const { data: app } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return null

  const { data: opp } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', app.opportunity_id)
    .maybeSingle()

  let resumeTitle = 'Master Resume'
  if (app.resume_version_id) {
    const { data: resume } = await supabase.from('resume_versions').select('title').eq('id', app.resume_version_id).maybeSingle()
    resumeTitle = resume?.title || 'Tailored Resume'
  }

  let coverLetterTitle = 'Custom Cover Letter'
  if (app.cover_letter_id) {
    const { data: cl } = await supabase.from('cover_letters').select('title').eq('id', app.cover_letter_id).maybeSingle()
    coverLetterTitle = cl?.title || 'Cover Letter'
  }

  const { data: result, error } = await supabase
    .from('why_we_applied')
    .insert({
      application_id: applicationId,
      member_id: app.member_id,
      employer: app.employer,
      position_title: app.job_title,
      location: opp?.location || null,
      salary_text: opp?.salary_text || (opp?.salary_min && opp?.salary_max ? `$${opp.salary_min.toLocaleString()} - $${opp.salary_max.toLocaleString()}` : null),
      application_date: app.date_submitted,
      current_status: app.status,
      posting_link: opp?.posting_url || null,
      why_selected: opp?.why_it_matches || null,
      how_it_matches: opp?.why_it_matches || null,
      skills_highlighted: null,
      resume_version_title: resumeTitle,
      cover_letter_title: coverLetterTitle,
      potential_challenges: opp?.potential_concerns || null,
      interview_prep_notes: null,
      strategist_name: null,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating why we applied:', error)
    return null
  }

  return result as WhyWeApplied | null
}

export async function getWhyWeApplied(applicationId: string): Promise<WhyWeApplied | null> {
  const { data, error } = await supabase
    .from('why_we_applied')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching why we applied:', error)
    return null
  }

  return data as WhyWeApplied | null
}

// ============================================================
// RESUME VERSIONS
// ============================================================

export async function getResumeVersions(memberId: string): Promise<ResumeVersion[]> {
  const { data, error } = await supabase
    .from('resume_versions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching resume versions:', error)
    return []
  }

  return (data ?? []) as ResumeVersion[]
}

export async function createResumeVersion(data: Partial<ResumeVersion>): Promise<ResumeVersion | null> {
  const { data: result, error } = await supabase
    .from('resume_versions')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating resume version:', error)
    return null
  }

  return result as ResumeVersion | null
}

export async function updateResumeVersion(id: string, data: Partial<ResumeVersion>): Promise<void> {
  const { error } = await supabase
    .from('resume_versions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating resume version:', error)
}

// ============================================================
// COVER LETTERS
// ============================================================

export async function getCoverLetters(memberId: string): Promise<CoverLetter[]> {
  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cover letters:', error)
    return []
  }

  return (data ?? []) as CoverLetter[]
}

export async function createCoverLetter(data: Partial<CoverLetter>): Promise<CoverLetter | null> {
  const { data: result, error } = await supabase
    .from('cover_letters')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating cover letter:', error)
    return null
  }

  return result as CoverLetter | null
}

export async function updateCoverLetter(id: string, data: Partial<CoverLetter>): Promise<void> {
  const { error } = await supabase
    .from('cover_letters')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating cover letter:', error)
}

// ============================================================
// CAREER NOTES
// ============================================================

export async function getCareerNotes(memberId: string): Promise<CareerNote[]> {
  const { data, error } = await supabase
    .from('career_notes')
    .select('*')
    .eq('member_id', memberId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching career notes:', error)
    return []
  }

  return (data ?? []) as CareerNote[]
}

export async function createCareerNote(data: Partial<CareerNote>): Promise<CareerNote | null> {
  const { data: result, error } = await supabase
    .from('career_notes')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating career note:', error)
    return null
  }

  return result as CareerNote | null
}

export async function updateCareerNote(id: string, data: Partial<CareerNote>): Promise<void> {
  const { error } = await supabase
    .from('career_notes')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating career note:', error)
}

export async function deleteCareerNote(id: string): Promise<void> {
  const { error } = await supabase.from('career_notes').delete().eq('id', id)
  if (error) console.error('Error deleting career note:', error)
}

// ============================================================
// FOLLOW-UPS
// ============================================================

export async function getFollowUps(strategistId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('strategist_id', strategistId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching follow-ups:', error)
    return []
  }

  return (data ?? []) as FollowUp[]
}

export async function createFollowUp(data: Partial<FollowUp>): Promise<FollowUp | null> {
  const { data: result, error } = await supabase
    .from('follow_ups')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating follow-up:', error)
    return null
  }

  return result as FollowUp | null
}

export async function updateFollowUp(id: string, data: Partial<FollowUp>): Promise<void> {
  const { error } = await supabase
    .from('follow_ups')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('Error updating follow-up:', error)
}

// ============================================================
// MEMBER FEEDBACK
// ============================================================

export async function createFeedback(data: Partial<MemberFeedback>): Promise<MemberFeedback | null> {
  const { data: result, error } = await supabase
    .from('member_feedback')
    .insert(data)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error creating feedback:', error)
    return null
  }

  if (result) {
    const { data: opp } = await supabase.from('opportunities').select('member_id, job_title, employer').eq('id', data.opportunity_id).maybeSingle()
    if (opp) {
      await addTimelineEvent(opp.member_id, 'feedback_updated', 'Feedback Updated', `${data.feedback_type} for ${opp.job_title} at ${opp.employer}`)
    }
  }

  return result as MemberFeedback | null
}

export async function getFeedback(memberId: string): Promise<MemberFeedback[]> {
  const { data, error } = await supabase
    .from('member_feedback')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching feedback:', error)
    return []
  }

  return (data ?? []) as MemberFeedback[]
}

// ============================================================
// STRATEGIST ASSIGNMENTS
// ============================================================

export async function getAssignedMembers(strategistId: string): Promise<{ member_id: string; assigned_at: string }[]> {
  const { data, error } = await supabase
    .from('strategist_assignments')
    .select('member_id, assigned_at')
    .eq('strategist_id', strategistId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching assignments:', error)
    return []
  }

  return (data ?? []) as { member_id: string; assigned_at: string }[]
}

export async function assignStrategist(strategistId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('strategist_assignments')
    .insert({ strategist_id: strategistId, member_id: memberId })

  if (error) console.error('Error assigning strategist:', error)
}

// Admin-only: assign (or reassign) any member to any eligible strategist.
// Unlike assignStrategist() above (which only lets a strategist claim a
// member for themselves), this goes through a SECURITY DEFINER RPC since
// admins have no direct RLS path to write another strategist's rows.
export async function adminAssignStrategist(memberId: string, strategistId: string): Promise<string | null> {
  const { error } = await supabase.rpc('admin_assign_strategist', {
    p_member_id: memberId,
    p_strategist_id: strategistId,
  })
  if (error) {
    console.error('Error assigning strategist:', error)
    return error.message
  }
  return null
}

export async function getEligibleStrategists(): Promise<EligibleStrategist[]> {
  const { data, error } = await supabase.rpc('admin_list_strategists')
  if (error) {
    console.error('Error fetching eligible strategists:', error)
    return []
  }
  return (data ?? []) as EligibleStrategist[]
}
