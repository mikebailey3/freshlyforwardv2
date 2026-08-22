import { useEffect, useMemo, useState } from 'react'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAssignedMembers, createOpportunity } from '@/lib/operations'
import { cn, formatDate, timeAgo } from '@/lib/utils'
import {
  Search, Plus, X, MapPin, DollarSign, Briefcase, ExternalLink,
  FileText, Stethoscope, Lightbulb, AlertTriangle, ShieldCheck,
  Clock, User, ChevronDown,
} from 'lucide-react'
import type { Opportunity, MemberProfile } from '@/types'
import { OPPORTUNITY_STATUSES } from '@/types'

interface MemberOption {
  member_id: string
  full_name: string | null
  headline: string | null
}

type StatusFilter = 'all' | (typeof OPPORTUNITY_STATUSES)[number]

const STATUS_COLORS: Record<string, string> = {
  researching: 'bg-neutral-100 text-neutral-700',
  needs_review: 'bg-accent-100 text-accent-700',
  recommended: 'bg-primary-100 text-primary-700',
  awaiting_member_approval: 'bg-warning-100 text-warning-700',
  approved: 'bg-success-100 text-success-700',
  declined: 'bg-error-100 text-error-700',
  preparing_application: 'bg-primary-100 text-primary-700',
  submitted: 'bg-success-100 text-success-700',
  expired: 'bg-neutral-100 text-neutral-500',
  archived: 'bg-neutral-100 text-neutral-500',
}

const STATUS_LABELS: Record<string, string> = {
  researching: 'Researching',
  needs_review: 'Needs Review',
  recommended: 'Recommended',
  awaiting_member_approval: 'Awaiting Approval',
  approved: 'Approved',
  declined: 'Declined',
  preparing_application: 'Preparing Application',
  submitted: 'Submitted',
  expired: 'Expired',
  archived: 'Archived',
}

const WORK_ARRANGEMENTS = ['On-site', 'Hybrid', 'Remote', 'Flexible']
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']

export function StrategistOpportunitiesPage() {
  const { user, role } = useAuth()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, MemberProfile | null>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    member_id: '',
    employer: '',
    job_title: '',
    location: '',
    salary_min: '',
    salary_max: '',
    work_arrangement: '',
    employment_type: '',
    posting_url: '',
    source: '',
    full_job_description: '',
    research_notes: '',
    why_it_matches: '',
    potential_concerns: '',
    authorization_mode: 'approval_required' as 'approval_required' | 'preauthorized',
  })

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    const assignments = await getAssignedMembers(user.id)
    const memberIds = assignments.map((a) => a.member_id)

    // Load member profiles
    const memberOptions: MemberOption[] = []
    const mMap: Record<string, MemberProfile | null> = {}
    for (const a of assignments) {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('user_id', a.member_id)
        .maybeSingle()
      mMap[a.member_id] = profile as MemberProfile | null
      memberOptions.push({
        member_id: a.member_id,
        full_name: (profile as MemberProfile | null)?.full_name ?? null,
        headline: (profile as MemberProfile | null)?.headline ?? null,
      })
    }
    setMembers(memberOptions)
    setMemberMap(mMap)

    // Load all opportunities for assigned members
    if (memberIds.length > 0) {
      const { data: opps } = await supabase
        .from('opportunities')
        .select('*')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false })
      setOpportunities((opps ?? []) as Opportunity[])
    }

    setLoading(false)
  }

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      const matchesSearch =
        !searchQuery ||
        o.employer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.job_title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [opportunities, statusFilter, searchQuery])

  // Group by status
  const groupedOpportunities = useMemo(() => {
    const groups: Record<string, Opportunity[]> = {}
    for (const opp of filteredOpportunities) {
      if (!groups[opp.status]) groups[opp.status] = []
      groups[opp.status].push(opp)
    }
    return groups
  }, [filteredOpportunities])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const opp of opportunities) {
      counts[opp.status] = (counts[opp.status] || 0) + 1
    }
    return counts
  }, [opportunities])

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      member_id: '',
      employer: '',
      job_title: '',
      location: '',
      salary_min: '',
      salary_max: '',
      work_arrangement: '',
      employment_type: '',
      posting_url: '',
      source: '',
      full_job_description: '',
      research_notes: '',
      why_it_matches: '',
      potential_concerns: '',
      authorization_mode: 'approval_required',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!formData.member_id || !formData.employer || !formData.job_title) return

    setSubmitting(true)
    await createOpportunity({
      member_id: formData.member_id,
      strategist_id: user.id,
      employer: formData.employer,
      job_title: formData.job_title,
      location: formData.location || null,
      salary_min: formData.salary_min ? parseInt(formData.salary_min, 10) : null,
      salary_max: formData.salary_max ? parseInt(formData.salary_max, 10) : null,
      work_arrangement: formData.work_arrangement || null,
      employment_type: formData.employment_type || null,
      posting_url: formData.posting_url || null,
      source: formData.source || null,
      full_job_description: formData.full_job_description || null,
      research_notes: formData.research_notes || null,
      why_it_matches: formData.why_it_matches || null,
      potential_concerns: formData.potential_concerns || null,
      authorization_mode: formData.authorization_mode,
      status: formData.authorization_mode === 'preauthorized' ? 'preparing_application' : 'researching',
      preauthorized_qualification: {},
    })

    resetForm()
    setShowCreateForm(false)
    setSubmitting(false)
    await loadData()
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin={role === 'admin'}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin={role === 'admin'}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Opportunity Pipeline</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {opportunities.length} opportunit{opportunities.length !== 1 ? 'ies' : 'y'} across {members.length} member{members.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Create Opportunity
        </button>
      </div>

      {/* Search & filter */}
      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employer or job title..."
              aria-label="Search opportunities"
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-neutral-600">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by status"
              className="rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-8 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Statuses ({opportunities.length})</option>
              {OPPORTUNITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]} ({statusCounts[s] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities grouped by status */}
      {filteredOpportunities.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            {opportunities.length === 0
              ? 'No opportunities yet. Click "Create Opportunity" to add one.'
              : 'No opportunities match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOpportunities).map(([status, opps]) => (
            <div key={status}>
              <div className="mb-3 flex items-center gap-2">
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', STATUS_COLORS[status] || 'bg-neutral-100 text-neutral-700')}>
                  {STATUS_LABELS[status] || status}
                </span>
                <span className="text-sm text-neutral-500">({opps.length})</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {opps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    memberName={memberMap[opp.member_id]?.full_name || 'Unknown'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Opportunity Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/50 p-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-neutral-200 bg-white px-6 py-4">
              <h2 className="font-serif text-lg font-semibold text-neutral-900">Create Opportunity</h2>
              <button
                onClick={() => { setShowCreateForm(false); resetForm() }}
                aria-label="Close create opportunity form"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {/* Member selection */}
              <div>
                <label htmlFor="member_id" className="mb-1 block text-sm font-medium text-neutral-700">
                  Member <span className="text-error-600">*</span>
                </label>
                <select
                  id="member_id"
                  required
                  value={formData.member_id}
                  onChange={(e) => handleFormChange('member_id', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select a member...</option>
                  {members.map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.full_name || 'Unknown'} {m.headline ? `— ${m.headline}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employer & Job Title */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="employer" className="mb-1 block text-sm font-medium text-neutral-700">
                    Employer <span className="text-error-600">*</span>
                  </label>
                  <input
                    id="employer"
                    type="text"
                    required
                    value={formData.employer}
                    onChange={(e) => handleFormChange('employer', e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="job_title" className="mb-1 block text-sm font-medium text-neutral-700">
                    Job Title <span className="text-error-600">*</span>
                  </label>
                  <input
                    id="job_title"
                    type="text"
                    required
                    value={formData.job_title}
                    onChange={(e) => handleFormChange('job_title', e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Location & Source */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="location" className="mb-1 block text-sm font-medium text-neutral-700">Location</label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="source" className="mb-1 block text-sm font-medium text-neutral-700">Source</label>
                  <input
                    id="source"
                    type="text"
                    value={formData.source}
                    onChange={(e) => handleFormChange('source', e.target.value)}
                    placeholder="LinkedIn, Indeed, Referral..."
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Salary range */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="salary_min" className="mb-1 block text-sm font-medium text-neutral-700">Salary Min ($)</label>
                  <input
                    id="salary_min"
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => handleFormChange('salary_min', e.target.value)}
                    placeholder="50000"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="salary_max" className="mb-1 block text-sm font-medium text-neutral-700">Salary Max ($)</label>
                  <input
                    id="salary_max"
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => handleFormChange('salary_max', e.target.value)}
                    placeholder="80000"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Work arrangement & employment type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="work_arrangement" className="mb-1 block text-sm font-medium text-neutral-700">Work Arrangement</label>
                  <select
                    id="work_arrangement"
                    value={formData.work_arrangement}
                    onChange={(e) => handleFormChange('work_arrangement', e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select...</option>
                    {WORK_ARRANGEMENTS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="employment_type" className="mb-1 block text-sm font-medium text-neutral-700">Employment Type</label>
                  <select
                    id="employment_type"
                    value={formData.employment_type}
                    onChange={(e) => handleFormChange('employment_type', e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select...</option>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Posting URL */}
              <div>
                <label htmlFor="posting_url" className="mb-1 block text-sm font-medium text-neutral-700">Posting URL</label>
                <input
                  id="posting_url"
                  type="url"
                  value={formData.posting_url}
                  onChange={(e) => handleFormChange('posting_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Authorization mode */}
              <div>
                <label htmlFor="authorization_mode" className="mb-1 block text-sm font-medium text-neutral-700">Authorization Mode</label>
                <select
                  id="authorization_mode"
                  value={formData.authorization_mode}
                  onChange={(e) => handleFormChange('authorization_mode', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="approval_required">Approval Required (member must approve)</option>
                  <option value="preauthorized">Preauthorized (member has given blanket consent)</option>
                </select>
              </div>

              {/* Full job description */}
              <div>
                <label htmlFor="full_job_description" className="mb-1 block text-sm font-medium text-neutral-700">Full Job Description</label>
                <textarea
                  id="full_job_description"
                  rows={4}
                  value={formData.full_job_description}
                  onChange={(e) => handleFormChange('full_job_description', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Research notes */}
              <div>
                <label htmlFor="research_notes" className="mb-1 block text-sm font-medium text-neutral-700">Research Notes</label>
                <textarea
                  id="research_notes"
                  rows={3}
                  value={formData.research_notes}
                  onChange={(e) => handleFormChange('research_notes', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Why it matches */}
              <div>
                <label htmlFor="why_it_matches" className="mb-1 block text-sm font-medium text-neutral-700">Why It Matches</label>
                <textarea
                  id="why_it_matches"
                  rows={3}
                  value={formData.why_it_matches}
                  onChange={(e) => handleFormChange('why_it_matches', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Potential concerns */}
              <div>
                <label htmlFor="potential_concerns" className="mb-1 block text-sm font-medium text-neutral-700">Potential Concerns</label>
                <textarea
                  id="potential_concerns"
                  rows={3}
                  value={formData.potential_concerns}
                  onChange={(e) => handleFormChange('potential_concerns', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); resetForm() }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Opportunity
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StrategistLayout>
  )
}

function OpportunityCard({ opportunity, memberName }: { opportunity: Opportunity; memberName: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:border-primary-300">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-sm font-semibold text-neutral-900 truncate">{opportunity.job_title}</h3>
          <p className="text-sm text-primary-600 font-medium truncate">{opportunity.employer}</p>
        </div>
        <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[opportunity.status] || 'bg-neutral-100 text-neutral-700')}>
          {STATUS_LABELS[opportunity.status] || opportunity.status}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-500">
        <User className="h-3.5 w-3.5" />
        <span className="truncate">{memberName}</span>
      </div>

      <div className="space-y-1.5 text-xs text-neutral-600">
        {opportunity.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            <span>{opportunity.location}</span>
          </div>
        )}
        {opportunity.work_arrangement && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
            <span>{opportunity.work_arrangement}{opportunity.employment_type ? ` · ${opportunity.employment_type}` : ''}</span>
          </div>
        )}
        {(opportunity.salary_min || opportunity.salary_max) && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
            <span>
              {opportunity.salary_min ? `$${opportunity.salary_min.toLocaleString()}` : ''}
              {opportunity.salary_min && opportunity.salary_max ? ' - ' : ''}
              {opportunity.salary_max ? `$${opportunity.salary_max.toLocaleString()}` : ''}
            </span>
          </div>
        )}
        {opportunity.posting_url && (
          <div className="flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
            <a
              href={opportunity.posting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-primary-600 hover:text-primary-700"
            >
              View posting
            </a>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2">
        <div className="flex items-center gap-1.5">
          {opportunity.authorization_mode === 'preauthorized' ? (
            <span className="inline-flex items-center gap-1 text-xs text-success-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Preauthorized
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-warning-600">
              <Clock className="h-3.5 w-3.5" />
              Approval needed
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-400">{timeAgo(opportunity.created_at)}</span>
      </div>
    </div>
  )
}
