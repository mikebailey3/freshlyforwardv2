export interface MembershipPlan {
  id: string
  slug: string
  name: string
  description: string
  price_cents: number
  interval: string
  stripe_price_id: string | null
  stripe_product_id: string | null
  features: string[]
  badge: string | null
  promotional_text: string | null
  is_featured: boolean
  is_enabled: boolean
  is_archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AdminMemberSummary {
  user_id: string
  email: string
  full_name: string | null
  headline: string | null
  plan_id: string | null
  plan_name: string | null
  subscription_status: string
  account_status: 'active' | 'suspended' | 'banned'
  account_status_reason: string | null
  onboarding_completed: boolean
  search_readiness_score: number
  is_strategist: boolean
  strategist_id: string | null
  strategist_name: string | null
  created_at: string
}

export interface EligibleStrategist {
  user_id: string
  full_name: string | null
  email: string
  is_admin: boolean
  active_member_count: number
}

export interface LinkedInProfileData {
  id: string
  member_id: string
  linkedin_url: string | null
  target_role: string | null
  headline: string
  about: string
  experience_bullets: string
  skills: string[]
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type BlogCategory = 'Job Search Tips' | 'Interview Prep' | 'Career Growth' | 'FreshlyForward Updates'
export type BlogPostStatus = 'draft' | 'scheduled' | 'published'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: BlogCategory
  cover_image_url: string | null
  read_time_minutes: number
  status: BlogPostStatus
  author_id: string | null
  author_name: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface Feature {
  id: string
  feature_key: string
  display_name: string
  description: string
  icon: string
  sort_order: number
  visibility: 'visible' | 'locked' | 'hidden'
  is_coming_soon: boolean
  upgrade_title: string | null
  upgrade_body: string | null
  upgrade_cta: string | null
  created_at: string
  updated_at: string
}

export type BadgeType = 'membership' | 'achievement'
export type BadgeColorScheme = 'green' | 'gold' | 'navy' | 'silver' | 'blue' | 'purple'

export interface Badge {
  id: string
  slug: string
  badge_type: BadgeType
  name: string
  description: string
  icon: string
  color_scheme: BadgeColorScheme
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MemberBadge {
  id: string
  user_id: string
  badge_id: string
  awarded_at: string
  badge?: Badge
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature_id: string
  is_enabled: boolean
  created_at: string
}

export type FeatureKey =
  | 'career_profile'
  | 'resume_support'
  | 'job_search'
  | 'hand_selected_opportunities'
  | 'applications'
  | 'cover_letters'
  | 'friday_reports'
  | 'direct_messaging'
  | 'mock_interviews'
  | 'interview_preparation'
  | 'resume_updates'
  | 'career_strategy_reviews'
  | 'priority_messaging'
  | 'workplace_success_coaching'
  | 'promotion_planning'
  | 'salary_coaching'
  | 'leadership_development'
  | 'career_roadmap'
  | 'achievement_vault'
  | 'resume_maintenance'
  | 'quarterly_career_reviews'
  | 'priority_concierge_support'

export interface MemberProfile {
  id: string
  user_id: string
  plan_id: string | null
  status: string
  username: string | null
  avatar_url: string | null
  headline: string | null
  summary: string | null
  full_name: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  employment_history: EmploymentEntry[]
  education: EducationEntry[]
  certifications: CertificationEntry[]
  skills: string[]
  preferred_jobs: string[]
  jobs_to_avoid: string[]
  preferred_industries: string[]
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  preferred_benefits: string[]
  schedule_preference: string | null
  max_commute_minutes: number | null
  remote_preference: string | null
  willing_to_relocate: boolean | null
  travel_willingness: string | null
  work_style: string | null
  career_goals: string | null
  strengths: string | null
  weaknesses: string | null
  jobs_enjoyed: string | null
  jobs_not_enjoyed: string | null
  motivators: string | null
  biggest_challenge: string | null
  application_authorized: boolean
  electronic_consent: boolean
  consent_date: string | null
  search_readiness_score: number
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  account_status: 'active' | 'suspended' | 'banned'
  account_status_reason: string | null
  account_status_changed_at: string | null
  is_strategist: boolean
  created_at: string
  updated_at: string
}

export interface EmploymentEntry {
  company: string
  title: string
  start_date: string
  end_date: string | null
  current: boolean
  description: string
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  graduation_year: string | null
}

export interface CertificationEntry {
  name: string
  issuer: string
  date: string | null
  expiry: string | null
}

export interface QuestionnaireResponse {
  id: string
  user_id: string
  section_key: string
  section_data: Record<string, unknown>
  is_complete: boolean
  updated_at: string
  created_at: string
}

export interface CareerTimelineEvent {
  id: string
  user_id: string
  event_type: string
  event_title: string
  event_description: string | null
  event_date: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface MemberDocument {
  id: string
  user_id: string
  document_type: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  storage_bucket: string
  uploaded_at: string
}

export interface FridayReport {
  id: string
  user_id: string
  strategist_id: string | null
  report_date: string
  title: string
  summary: string
  opportunities_reviewed: number
  applications_submitted: number
  interviews_scheduled: number
  next_steps: string | null
  reporting_period_start: string | null
  reporting_period_end: string | null
  strategist_summary: string | null
  opportunities_researched: string | null
  applications_submitted_detail: string | null
  interviews_detail: string | null
  approval_status: string
  approved_by: string | null
  approved_at: string | null
  sent_at: string | null
  report_data: Record<string, unknown>
  created_at: string
}

export interface Message {
  id: string
  user_id: string
  sender_type: string
  body: string
  is_read: boolean
  created_at: string
  conversation_id: string | null
  read_at: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
}

export interface MockInterview {
  id: string
  user_id: string
  scheduled_at: string
  focus_area: string | null
  status: string
  feedback: string | null
  company: string | null
  position: string | null
  interview_type: string | null
  duration_minutes: number | null
  meeting_platform: string | null
  meeting_link: string | null
  created_at: string
}

export interface CareerSuccessItem {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  sort_order: number
  is_active: boolean
  is_coming_soon: boolean
}

export interface OnboardingProgress {
  id: string
  user_id: string
  current_step: string
  completed_steps: string[]
  started_at: string
  completed_at: string | null
}

export interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: string
  discount_value: number
  stripe_coupon_id: string | null
  max_redemptions: number | null
  times_redeemed: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  is_founding_member: boolean
}

// ============================================================
// Phase 4 Types
// ============================================================

export type UserRole = 'member' | 'strategist' | 'admin'

export interface StrategistAssignment {
  id: string
  strategist_id: string
  member_id: string
  is_active: boolean
  assigned_at: string
}

export interface Opportunity {
  id: string
  member_id: string
  strategist_id: string | null
  employer: string
  job_title: string
  location: string | null
  salary_min: number | null
  salary_max: number | null
  salary_text: string | null
  work_arrangement: string | null
  benefits: string[]
  schedule: string | null
  employment_type: string | null
  posting_url: string | null
  posting_date: string | null
  expiration_date: string | null
  source: string | null
  full_job_description: string | null
  research_notes: string | null
  internal_notes: string | null
  member_visible_notes: string | null
  why_it_matches: string | null
  potential_concerns: string | null
  status: string
  authorization_mode: string
  preauthorized_qualification: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ScrapedJob {
  id: string
  source: string
  external_id: string
  title: string
  company: string
  location: string | null
  description: string
  salary_text: string | null
  employment_type: string | null
  posting_url: string
  posted_at: string | null
  search_query: string | null
  is_active: boolean
  scraped_at: string
  created_at: string
}

export interface JobMatchScoreBreakdown {
  skillsCoverage: number
  roleRelevance: number
  locationFit: number
  keywordDensity: number
}

export interface JobMatch {
  id: string
  member_id: string
  scraped_job_id: string
  fresh_fit_score: number
  matched_skills: string[]
  missing_skills: string[]
  score_breakdown: JobMatchScoreBreakdown | Record<string, never>
  dismissed_at: string | null
  promoted_opportunity_id: string | null
  computed_at: string
}

export interface JobMatchWithJob extends JobMatch {
  scraped_job: ScrapedJob
}

export interface Application {
  id: string
  opportunity_id: string
  member_id: string
  strategist_id: string | null
  employer: string
  job_title: string
  date_found: string | null
  date_submitted: string | null
  source: string | null
  resume_version_id: string | null
  cover_letter_id: string | null
  authorization_used: string
  status: string
  follow_up_date: string | null
  interview_date: string | null
  offer_details: string | null
  internal_notes: string | null
  member_notes: string | null
  created_at: string
  updated_at: string
}

export interface ResumeVersion {
  id: string
  member_id: string
  title: string
  version_number: number
  is_master: boolean
  is_archived: boolean
  file_path: string | null
  file_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CoverLetter {
  id: string
  member_id: string
  title: string
  body: string
  is_template: boolean
  is_archived: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CareerNote {
  id: string
  member_id: string
  strategist_id: string
  note: string
  category: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  member_id: string
  strategist_id: string
  application_id: string | null
  opportunity_id: string | null
  title: string
  description: string | null
  due_date: string
  status: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface MemberFeedback {
  id: string
  member_id: string
  opportunity_id: string | null
  application_id: string | null
  feedback_type: string
  comment: string | null
  created_at: string
}

export interface WhyWeApplied {
  id: string
  application_id: string
  member_id: string
  employer: string
  position_title: string
  location: string | null
  salary_text: string | null
  application_date: string | null
  current_status: string
  posting_link: string | null
  why_selected: string | null
  how_it_matches: string | null
  skills_highlighted: string | null
  resume_version_title: string | null
  cover_letter_title: string | null
  potential_challenges: string | null
  interview_prep_notes: string | null
  strategist_name: string | null
  created_at: string
  updated_at: string
}

export const OPPORTUNITY_STATUSES = [
  'researching',
  'needs_review',
  'recommended',
  'awaiting_member_approval',
  'approved',
  'declined',
  'preparing_application',
  'submitted',
  'expired',
  'archived',
] as const

export const APPLICATION_STATUSES = [
  'preparing_resume',
  'preparing_cover_letter',
  'waiting_on_member',
  'ready_to_submit',
  'submitted',
  'employer_viewed',
  'follow_up_needed',
  'interview_requested',
  'interview_scheduled',
  'rejected',
  'offer_received',
  'offer_accepted',
  'closed',
] as const

// ============================================================
// Phase 5 Types
// ============================================================

export interface FoundingMemberFeedback {
  id: string
  member_id: string
  feedback_type: string
  title: string
  description: string | null
  votes: number
  status: string
  admin_response: string | null
  created_at: string
  updated_at: string
}

export interface BetaFeature {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  target_audience: string
  is_enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SuccessStoryRequest {
  id: string
  member_id: string
  strategist_id: string
  request_type: string
  status: string
  member_response: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  body: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ReportTemplate {
  id: string
  slug: string
  name: string
  header: string | null
  footer: string | null
  branding: string | null
  signature: string | null
  primary_color: string
  legal_disclaimer: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ReportApproval {
  id: string
  report_id: string
  admin_id: string | null
  status: string
  approved_at: string | null
  notes: string | null
  created_at: string
}

export interface Conversation {
  id: string
  member_id: string
  strategist_id: string | null
  last_message_at: string
  is_archived: boolean
  is_pinned: boolean
  created_at: string
}

export interface InterviewPrep {
  id: string
  member_id: string
  application_id: string | null
  mock_interview_id: string | null
  company: string | null
  position: string | null
  interview_type: string | null
  company_overview: string | null
  role_summary: string | null
  important_qualifications: string | null
  talking_points: string | null
  star_story_suggestions: string | null
  questions_to_ask: string | null
  salary_guidance: string | null
  dress_suggestions: string | null
  research_notes: string | null
  directions: string | null
  meeting_link: string | null
  checklist: unknown[]
  uploaded_notes: string | null
  created_at: string
  updated_at: string
}

export interface InterviewFeedback {
  id: string
  mock_interview_id: string
  member_id: string
  strategist_id: string
  confidence: number | null
  communication: number | null
  leadership: number | null
  professionalism: number | null
  storytelling: number | null
  star_method: number | null
  body_language: number | null
  preparation: number | null
  areas_to_improve: string | null
  action_plan: string | null
  next_goals: string | null
  member_acknowledged: boolean
  acknowledged_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  notification_type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface CommunicationPreferences {
  id: string
  user_id: string
  email_notifications: boolean
  sms_notifications: boolean
  browser_notifications: boolean
  weekly_digest: boolean
  immediate_alerts: boolean
  marketing_emails: boolean
  updated_at: string
}

export interface ActivityFeedItem {
  id: string
  user_id: string
  activity_type: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  event_type: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  meeting_link: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface StrategistReminder {
  id: string
  strategist_id: string
  member_id: string | null
  reminder_type: string
  title: string
  description: string | null
  trigger_milestone: string | null
  is_dismissed: boolean
  created_at: string
}

export const NOTIFICATION_TYPES = [
  'new_message',
  'new_opportunity',
  'approval_needed',
  'application_submitted',
  'interview_scheduled',
  'friday_report_ready',
  'mock_interview_reminder',
  'profile_incomplete',
  'resume_needs_updating',
  'membership_renewal',
  'payment_failure',
  'system_announcement',
  'strategist_assigned',
] as const

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  new_message: 'New Message',
  new_opportunity: 'New Opportunity',
  approval_needed: 'Approval Needed',
  application_submitted: 'Application Submitted',
  interview_scheduled: 'Interview Scheduled',
  friday_report_ready: 'Friday Report Ready',
  mock_interview_reminder: 'Mock Interview Reminder',
  profile_incomplete: 'Profile Incomplete',
  resume_needs_updating: 'Resume Needs Updating',
  membership_renewal: 'Membership Renewal',
  payment_failure: 'Payment Failure',
  system_announcement: 'System Announcement',
  strategist_assigned: 'Strategist Matched',
}

export const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  new_message: 'MessageSquare',
  new_opportunity: 'Search',
  approval_needed: 'AlertCircle',
  application_submitted: 'FileText',
  interview_scheduled: 'Calendar',
  friday_report_ready: 'FileText',
  mock_interview_reminder: 'Clock',
  profile_incomplete: 'User',
  resume_needs_updating: 'FileCheck',
  membership_renewal: 'CreditCard',
  payment_failure: 'AlertCircle',
  system_announcement: 'Bell',
  strategist_assigned: 'User',
}
