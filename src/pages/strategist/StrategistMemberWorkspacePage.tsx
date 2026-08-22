import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { calculateSearchReadiness } from '@/lib/profile'
import {
  getOpportunities, createOpportunity, updateOpportunity,
  getApplications, updateApplication, createApplication,
  getResumeVersions, createResumeVersion, updateResumeVersion,
  getCoverLetters, createCoverLetter, updateCoverLetter,
  getCareerNotes, createCareerNote, deleteCareerNote, updateCareerNote,
  createFollowUp, getFollowUps, updateFollowUp,
} from '@/lib/operations'
import { formatDate, timeAgo } from '@/lib/utils'
import {
  User, Briefcase, Search, FileText, Mail, Calendar, Clock,
  TrendingUp, Plus, Trash2, X, Check, AlertCircle, Loader2,
  GraduationCap, Wrench, Target, DollarSign, FileCheck, MessageSquare,
  ClipboardList, Send, Pin,
} from 'lucide-react'
import type {
  MemberProfile, Opportunity, Application, ResumeVersion,
  CoverLetter, CareerNote, FollowUp,
} from '@/types'

type TabKey = 'snapshot' | 'opportunities' | 'applications' | 'resumes' | 'cover_letters' | 'notes' | 'follow_ups' | 'messages' | 'timeline'

const tabs: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: 'snapshot', label: 'Snapshot', icon: User },
  { key: 'opportunities', label: 'Opportunities', icon: Search },
  { key: 'applications', label: 'Applications', icon: FileText },
  { key: 'resumes', label: 'Resumes', icon: FileCheck },
  { key: 'cover_letters', label: 'Cover Letters', icon: Mail },
  { key: 'notes', label: 'Career Notes', icon: ClipboardList },
  { key: 'follow_ups', label: 'Follow-ups', icon: Clock },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'timeline', label: 'Timeline', icon: Calendar },
]

export function StrategistMemberWorkspacePage() {
  const { memberId } = useParams<{ memberId: string }>()
  const { user, role } = useAuth()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('snapshot')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!memberId) return
    supabase
      .from('member_profiles')
      .select('*')
      .eq('user_id', memberId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as MemberProfile | null)
        setLoading(false)
      })
  }, [memberId])

  if (loading) {
    return (
      <StrategistLayout isAdmin={role === 'admin'}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  const readiness = profile ? calculateSearchReadiness(profile) : { score: 0, missing: [] }

  return (
    <StrategistLayout isAdmin={role === 'admin'}>
      {/* Header */}
      <div className="mb-6">
        <Link to="/strategist/members" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900">
          ← Back to Members
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-secondary-100">
            <User className="h-7 w-7 text-primary-600" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-neutral-900">
              {profile?.full_name || 'Unknown Member'}
            </h1>
            <p className="text-sm text-neutral-600">{profile?.headline || 'No headline set'}</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-semibold text-neutral-900">{readiness.score}%</span>
              <span className="text-xs text-neutral-500">Search Readiness</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'snapshot' && <SnapshotTab profile={profile} memberId={memberId!} />}
      {activeTab === 'opportunities' && <OpportunitiesTab memberId={memberId!} strategistId={user?.id || ''} />}
      {activeTab === 'applications' && <ApplicationsTab memberId={memberId!} strategistId={user?.id || ''} />}
      {activeTab === 'resumes' && <ResumesTab memberId={memberId!} />}
      {activeTab === 'cover_letters' && <CoverLettersTab memberId={memberId!} />}
      {activeTab === 'notes' && <NotesTab memberId={memberId!} strategistId={user?.id || ''} />}
      {activeTab === 'follow_ups' && <FollowUpsTab memberId={memberId!} strategistId={user?.id || ''} />}
      {activeTab === 'messages' && <MessagesTab memberId={memberId!} />}
      {activeTab === 'timeline' && <TimelineTab memberId={memberId!} />}
    </StrategistLayout>
  )
}

// ============================================================
// SNAPSHOT TAB
// ============================================================
function SnapshotTab({ profile, memberId }: { profile: MemberProfile | null; memberId: string }) {
  const readiness = profile ? calculateSearchReadiness(profile) : { score: 0, missing: [] }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 font-serif text-base font-semibold text-neutral-900">Career Snapshot</h3>
        <div className="space-y-3 text-sm">
          <Field label="Full Name" value={profile?.full_name} />
          <Field label="Headline" value={profile?.headline} />
          <Field label="Location" value={profile?.location} />
          <Field label="Phone" value={profile?.phone} />
          <Field label="LinkedIn" value={profile?.linkedin_url} />
          <Field label="Summary" value={profile?.summary} multiline />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 font-serif text-base font-semibold text-neutral-900">Search Readiness</h3>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Profile Completeness</span>
            <span className="font-serif text-2xl font-bold text-neutral-900">{readiness.score}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${readiness.score}%` }} />
          </div>
        </div>
        {readiness.missing.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-500">Missing:</p>
            <ul className="space-y-1">
              {readiness.missing.map((m) => (
                <li key={m.field} className="flex items-center gap-2 text-sm text-neutral-600">
                  <AlertCircle className="h-3.5 w-3.5 text-warning-500" />
                  {m.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-neutral-900">
          <Briefcase className="h-4 w-4 text-primary-600" />
          Work History
        </h3>
        {profile?.employment_history && profile.employment_history.length > 0 ? (
          <div className="space-y-3">
            {profile.employment_history.map((job, i) => (
              <div key={i} className="border-l-2 border-primary-200 pl-3">
                <p className="text-sm font-semibold text-neutral-900">{job.title}</p>
                <p className="text-sm text-neutral-600">{job.company}</p>
                <p className="text-xs text-neutral-500">{job.start_date} — {job.current ? 'Present' : job.end_date || 'N/A'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No work history.</p>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-neutral-900">
          <Target className="h-4 w-4 text-primary-600" />
          Preferences
        </h3>
        <div className="space-y-2 text-sm">
          <Field label="Preferred Jobs" value={profile?.preferred_jobs?.join(', ')} />
          <Field label="Industries" value={profile?.preferred_industries?.join(', ')} />
          <Field label="Salary Range" value={profile?.salary_min && profile?.salary_max ? `$${profile.salary_min.toLocaleString()} - $${profile.salary_max.toLocaleString()}` : undefined} />
          <Field label="Remote" value={profile?.remote_preference} />
          <Field label="Schedule" value={profile?.schedule_preference} />
          <Field label="Relocation" value={profile?.willing_to_relocate ? 'Yes' : 'No'} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-neutral-900">
          <Wrench className="h-4 w-4 text-primary-600" />
          Skills
        </h3>
        {profile?.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s, i) => (
              <span key={i} className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No skills listed.</p>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-base font-semibold text-neutral-900">
          <FileCheck className="h-4 w-4 text-primary-600" />
          Authorization
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${profile?.application_authorized ? 'bg-success-500' : 'bg-neutral-300'}`} />
            <span className="text-neutral-700">Application Authorization {profile?.application_authorized ? '✓' : 'Not given'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full ${profile?.electronic_consent ? 'bg-success-500' : 'bg-neutral-300'}`} />
            <span className="text-neutral-700">Electronic Consent {profile?.electronic_consent ? '✓' : 'Not given'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// OPPORTUNITIES TAB
// ============================================================
function OpportunitiesTab({ memberId, strategistId }: { memberId: string; strategistId: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => getOpportunities(memberId).then((data) => { setOpportunities(data); setLoading(false) })

  useEffect(() => { load() }, [memberId])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-neutral-900">Opportunity Pipeline</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Opportunity
        </button>
      </div>

      {showForm && (
        <OpportunityForm
          memberId={memberId}
          strategistId={strategistId}
          onSave={async (data) => {
            await createOpportunity(data)
            setShowForm(false)
            load()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {opportunities.length === 0 ? (
        <EmptyState text="No opportunities yet. Click Add Opportunity to research a new role." />
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div key={opp.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">{opp.status.replace(/_/g, ' ')}</span>
                  <p className="mt-2 text-sm font-semibold text-neutral-900">{opp.job_title} at {opp.employer}</p>
                  <p className="text-xs text-neutral-500">{opp.location} — {opp.salary_text || 'Salary TBD'}</p>
                  {opp.why_it_matches && <p className="mt-2 text-xs text-neutral-600">{opp.why_it_matches}</p>}
                </div>
                <select
                  value={opp.status}
                  onChange={async (e) => {
                    await updateOpportunity(opp.id, { status: e.target.value })
                    load()
                  }}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
                >
                  {['researching', 'needs_review', 'recommended', 'awaiting_member_approval', 'approved', 'declined', 'preparing_application', 'submitted', 'expired', 'archived'].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OpportunityForm({ memberId, strategistId, onSave, onCancel }: {
  memberId: string
  strategistId: string
  onSave: (data: Partial<Opportunity>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    employer: '', job_title: '', location: '', salary_min: '', salary_max: '',
    work_arrangement: '', employment_type: '', posting_url: '', source: '',
    full_job_description: '', research_notes: '', why_it_matches: '',
    potential_concerns: '', authorization_mode: 'approval_required',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      member_id: memberId,
      strategist_id: strategistId,
      employer: form.employer,
      job_title: form.job_title,
      location: form.location || null,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      work_arrangement: form.work_arrangement || null,
      employment_type: form.employment_type || null,
      posting_url: form.posting_url || null,
      source: form.source || null,
      full_job_description: form.full_job_description || null,
      research_notes: form.research_notes || null,
      why_it_matches: form.why_it_matches || null,
      potential_concerns: form.potential_concerns || null,
      authorization_mode: form.authorization_mode,
      status: form.authorization_mode === 'preauthorized' ? 'preparing_application' : 'researching',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-6">
      <h4 className="mb-4 font-serif text-base font-semibold text-neutral-900">New Opportunity</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Employer" value={form.employer} onChange={(v) => setForm({ ...form, employer: v })} required />
        <Input label="Job Title" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} required />
        <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        <Input label="Salary Min" type="number" value={form.salary_min} onChange={(v) => setForm({ ...form, salary_min: v })} />
        <Input label="Salary Max" type="number" value={form.salary_max} onChange={(v) => setForm({ ...form, salary_max: v })} />
        <Input label="Work Arrangement" value={form.work_arrangement} onChange={(v) => setForm({ ...form, work_arrangement: v })} />
        <Input label="Employment Type" value={form.employment_type} onChange={(v) => setForm({ ...form, employment_type: v })} />
        <Input label="Posting URL" value={form.posting_url} onChange={(v) => setForm({ ...form, posting_url: v })} />
        <Input label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
        <Select label="Authorization Mode" value={form.authorization_mode} onChange={(v) => setForm({ ...form, authorization_mode: v })}
          options={[{ value: 'approval_required', label: 'Approval Required' }, { value: 'preauthorized', label: 'Preauthorized' }]} />
      </div>
      <TextArea label="Full Job Description" value={form.full_job_description} onChange={(v) => setForm({ ...form, full_job_description: v })} />
      <TextArea label="Research Notes" value={form.research_notes} onChange={(v) => setForm({ ...form, research_notes: v })} />
      <TextArea label="Why It Matches" value={form.why_it_matches} onChange={(v) => setForm({ ...form, why_it_matches: v })} />
      <TextArea label="Potential Concerns" value={form.potential_concerns} onChange={(v) => setForm({ ...form, potential_concerns: v })} />
      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Check className="h-4 w-4" /> Create
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </form>
  )
}

// ============================================================
// APPLICATIONS TAB
// ============================================================
function ApplicationsTab({ memberId, strategistId }: { memberId: string; strategistId: string }) {
  const [applications, setApplications] = useState<Application[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    const [apps, opps] = await Promise.all([getApplications(memberId), getOpportunities(memberId)])
    setApplications(apps)
    setOpportunities(opps)
    setLoading(false)
  }

  useEffect(() => { load() }, [memberId])

  if (loading) return <LoadingSpinner />

  const approvedOpps = opportunities.filter((o) => o.status === 'approved' || o.status === 'preparing_application')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-neutral-900">Applications</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Create Application
        </button>
      </div>

      {showForm && (
        <ApplicationForm
          memberId={memberId}
          strategistId={strategistId}
          opportunities={approvedOpps}
          onSave={async (data) => {
            await createApplication(data)
            setShowForm(false)
            load()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {applications.length === 0 ? (
        <EmptyState text="No applications yet. Create one from an approved opportunity." />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">{app.status.replace(/_/g, ' ')}</span>
                  <p className="mt-2 text-sm font-semibold text-neutral-900">{app.job_title} at {app.employer}</p>
                  {app.date_submitted && <p className="text-xs text-neutral-500">Submitted: {formatDate(app.date_submitted)}</p>}
                  {app.interview_date && <p className="text-xs text-neutral-500">Interview: {formatDate(app.interview_date)}</p>}
                </div>
                <select
                  value={app.status}
                  onChange={async (e) => {
                    await updateApplication(app.id, { status: e.target.value })
                    load()
                  }}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
                >
                  {['preparing_resume', 'preparing_cover_letter', 'waiting_on_member', 'ready_to_submit', 'submitted', 'employer_viewed', 'follow_up_needed', 'interview_requested', 'interview_scheduled', 'rejected', 'offer_received', 'offer_accepted', 'closed'].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ApplicationForm({ memberId, strategistId, opportunities, onSave, onCancel }: {
  memberId: string
  strategistId: string
  opportunities: Opportunity[]
  onSave: (data: Partial<Application>) => void
  onCancel: () => void
}) {
  const [oppId, setOppId] = useState('')
  const [form, setForm] = useState({ source: '', internal_notes: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const opp = opportunities.find((o) => o.id === oppId)
    if (!opp) return
    onSave({
      opportunity_id: oppId,
      member_id: memberId,
      strategist_id: strategistId,
      employer: opp.employer,
      job_title: opp.job_title,
      date_found: new Date().toISOString().split('T')[0],
      source: form.source || null,
      internal_notes: form.internal_notes || null,
      status: 'preparing_resume',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-6">
      <h4 className="mb-4 font-serif text-base font-semibold text-neutral-900">New Application</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Opportunity</label>
          <select
            value={oppId}
            onChange={(e) => setOppId(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
          >
            <option value="">Select an approved opportunity…</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>{o.job_title} at {o.employer}</option>
            ))}
          </select>
        </div>
        <Input label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
        <TextArea label="Internal Notes" value={form.internal_notes} onChange={(v) => setForm({ ...form, internal_notes: v })} />
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Check className="h-4 w-4" /> Create
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </form>
  )
}

// ============================================================
// RESUMES TAB
// ============================================================
function ResumesTab({ memberId }: { memberId: string }) {
  const [resumes, setResumes] = useState<ResumeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => getResumeVersions(memberId).then((data) => { setResumes(data); setLoading(false) })
  useEffect(() => { load() }, [memberId])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-neutral-900">Resume Versions</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Add Version
        </button>
      </div>

      {showForm && (
        <ResumeForm memberId={memberId} onSave={async (data) => { await createResumeVersion(data); setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      )}

      {resumes.length === 0 ? (
        <EmptyState text="No resume versions yet." />
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900">{r.title}</p>
                    {r.is_master && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">Master</span>}
                    {r.is_archived && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">Archived</span>}
                  </div>
                  <p className="text-xs text-neutral-500">Version {r.version_number} — {formatDate(r.created_at)}</p>
                  {r.notes && <p className="mt-1 text-xs text-neutral-600">{r.notes}</p>}
                </div>
                <button
                  onClick={async () => { await updateResumeVersion(r.id, { is_archived: !r.is_archived }); load() }}
                  className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                  {r.is_archived ? 'Unarchive' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResumeForm({ memberId, onSave, onCancel }: { memberId: string; onSave: (data: Partial<ResumeVersion>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [isMaster, setIsMaster] = useState(false)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ member_id: memberId, title, notes: notes || null, is_master: isMaster, version_number: 1 }) }} className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-6">
      <h4 className="mb-4 font-serif text-base font-semibold text-neutral-900">New Resume Version</h4>
      <Input label="Title" value={title} onChange={setTitle} required />
      <TextArea label="Notes" value={notes} onChange={setNotes} />
      <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-primary-600" />
        Set as Master Resume
      </label>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Check className="h-4 w-4" /> Create
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </form>
  )
}

// ============================================================
// COVER LETTERS TAB
// ============================================================
function CoverLettersTab({ memberId }: { memberId: string }) {
  const [letters, setLetters] = useState<CoverLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => getCoverLetters(memberId).then((data) => { setLetters(data); setLoading(false) })
  useEffect(() => { load() }, [memberId])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-neutral-900">Cover Letters</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Add Letter
        </button>
      </div>

      {showForm && (
        <CoverLetterForm memberId={memberId} onSave={async (data) => { await createCoverLetter(data); setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      )}

      {letters.length === 0 ? (
        <EmptyState text="No cover letters yet." />
      ) : (
        <div className="space-y-3">
          {letters.map((l) => (
            <div key={l.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-neutral-900">{l.title}</p>
                {l.is_template && <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">Template</span>}
                {l.is_archived && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">Archived</span>}
              </div>
              <p className="mt-1 text-xs text-neutral-500">{formatDate(l.created_at)}</p>
              <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{l.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CoverLetterForm({ memberId, onSave, onCancel }: { memberId: string; onSave: (data: Partial<CoverLetter>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ member_id: memberId, title, body, is_template: isTemplate }) }} className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-6">
      <h4 className="mb-4 font-serif text-base font-semibold text-neutral-900">New Cover Letter</h4>
      <Input label="Title" value={title} onChange={setTitle} required />
      <div>
        <label className="block text-sm font-medium text-neutral-700">Body</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={8} className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-primary-600" />
        Save as Template
      </label>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Check className="h-4 w-4" /> Create
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </form>
  )
}

// ============================================================
// CAREER NOTES TAB
// ============================================================
function NotesTab({ memberId, strategistId }: { memberId: string; strategistId: string }) {
  const [notes, setNotes] = useState<CareerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [category, setCategory] = useState('')

  const load = () => getCareerNotes(memberId).then((data) => { setNotes(data); setLoading(false) })
  useEffect(() => { load() }, [memberId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    await createCareerNote({ member_id: memberId, strategist_id: strategistId, note: newNote, category: category || null })
    setNewNote('')
    setCategory('')
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-warning-500" />
        <p className="text-xs text-neutral-500">Career notes are private — visible only to Career Strategists and Admins.</p>
      </div>

      <form onSubmit={handleAdd} className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a private note about this member…"
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" /> Add Note
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState text="No career notes yet." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className={`rounded-xl border p-4 ${note.is_pinned ? 'border-accent-200 bg-accent-50' : 'border-neutral-200 bg-white'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {note.category && <span className="mb-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{note.category}</span>}
                  <p className="text-sm text-neutral-700">{note.note}</p>
                  <p className="mt-1 text-xs text-neutral-400">{timeAgo(note.created_at)}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={async () => { await updateCareerNote(note.id, { is_pinned: !note.is_pinned }); load() }}
                    className="p-1 text-neutral-400 hover:text-accent-600"
                    aria-label="Pin note"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => { await deleteCareerNote(note.id); load() }}
                    className="p-1 text-neutral-400 hover:text-error-600"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// FOLLOW-UPS TAB
// ============================================================
function FollowUpsTab({ memberId, strategistId }: { memberId: string; strategistId: string }) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '' })

  const load = async () => {
    const { data } = await supabase.from('follow_ups').select('*').eq('member_id', memberId).order('due_date', { ascending: true })
    setFollowUps((data as FollowUp[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [memberId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    await createFollowUp({ member_id: memberId, strategist_id: strategistId, title: form.title, description: form.description || null, due_date: form.due_date })
    setForm({ title: '', description: '', due_date: '' })
    setShowForm(false)
    load()
  }

  if (loading) return <LoadingSpinner />

  const today = new Date()
  const overdue = followUps.filter((f) => f.status === 'pending' && new Date(f.due_date) < today)
  const upcoming = followUps.filter((f) => f.status === 'pending' && new Date(f.due_date) >= today)
  const completed = followUps.filter((f) => f.status === 'completed')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-neutral-900">Follow-Ups</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Schedule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
          <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Input label="Due Date" type="date" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} required />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Cancel</button>
          </div>
        </form>
      )}

      {followUps.length === 0 ? (
        <EmptyState text="No follow-ups scheduled." />
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-error-600">Overdue</p>
              {overdue.map((f) => <FollowUpItem key={f.id} f={f} onComplete={load} />)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-primary-600">Upcoming</p>
              {upcoming.map((f) => <FollowUpItem key={f.id} f={f} onComplete={load} />)}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-success-600">Completed</p>
              {completed.map((f) => <FollowUpItem key={f.id} f={f} onComplete={load} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FollowUpItem({ f, onComplete }: { f: FollowUp; onComplete: () => void }) {
  return (
    <div className={`flex items-center justify-between rounded-xl border p-3 ${
      f.status === 'completed' ? 'border-success-200 bg-success-50' :
      new Date(f.due_date) < new Date() ? 'border-error-200 bg-error-50' : 'border-neutral-200 bg-white'
    }`}>
      <div>
        <p className="text-sm font-medium text-neutral-900">{f.title}</p>
        {f.description && <p className="text-xs text-neutral-600">{f.description}</p>}
        <p className="text-xs text-neutral-400">Due: {formatDate(f.due_date)}</p>
      </div>
      {f.status === 'pending' && (
        <button
          onClick={async () => { await updateFollowUp(f.id, { status: 'completed', completed_at: new Date().toISOString() }); onComplete() }}
          className="flex items-center gap-1 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-success-700"
        >
          <Check className="h-3 w-3" /> Complete
        </button>
      )}
    </div>
  )
}

// ============================================================
// MESSAGES TAB
// ============================================================
function MessagesTab({ memberId }: { memberId: string }) {
  const [messages, setMessages] = useState<{ id: string; body: string; sender_type: string; created_at: string; is_read: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('messages').select('*').eq('user_id', memberId).order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [memberId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    await supabase.from('messages').insert({ user_id: memberId, sender_type: 'strategist', body: body.trim(), is_read: true })
    setBody('')
    setSending(false)
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex h-[calc(100vh-20rem)] flex-col rounded-2xl border border-neutral-200 bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-neutral-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'strategist' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender_type === 'strategist' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-900'
                }`}>
                  {msg.body}
                  <p className={`mt-1 text-xs ${msg.sender_type === 'strategist' ? 'text-primary-200' : 'text-neutral-400'}`}>{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-neutral-200 p-4">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm"
          />
          <button type="submit" disabled={sending || !body.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// TIMELINE TAB
// ============================================================
function TimelineTab({ memberId }: { memberId: string }) {
  const [events, setEvents] = useState<{ id: string; event_type: string; event_title: string; event_description: string | null; event_date: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('career_timeline')
      .select('*')
      .eq('user_id', memberId)
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        setEvents(data || [])
        setLoading(false)
      })
  }, [memberId])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {events.length === 0 ? (
        <EmptyState text="No timeline events yet." />
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-neutral-200" />
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="relative flex items-start gap-4">
                <div className="z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 ring-4 ring-primary-100">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs text-neutral-400">{formatDate(event.event_date)}</p>
                  <p className="text-sm font-medium text-neutral-900">{event.event_title}</p>
                  {event.event_description && <p className="text-xs text-neutral-600">{event.event_description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Field({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  if (!value) return (
    <div>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm text-neutral-400">Not provided</p>
    </div>
  )
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-sm text-neutral-700 ${multiline ? '' : ''}`}>{value}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">{label}{required && <span className="ml-1 text-error-500">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
      <p className="text-sm text-neutral-500">{text}</p>
    </div>
  )
}
