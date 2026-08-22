import { useEffect, useState } from 'react'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAssignedMembers } from '@/lib/operations'
import {
  getReportsForStrategist, createDraftReport, updateReport,
  submitReportForReview, generateReportDraftData,
} from '@/lib/fridayReports'
import { formatDate, cn } from '@/lib/utils'
import {
  FileText, Loader2, Plus, Sparkles, Send, Save, User, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import type { FridayReport, MemberProfile } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', pending_review: 'In Review', approved: 'Approved (awaiting send)', sent: 'Sent to Member',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  pending_review: 'bg-warning-100 text-warning-700',
  approved: 'bg-accent-100 text-accent-700',
  sent: 'bg-success-100 text-success-700',
}
const STATUS_ICONS: Record<string, typeof Clock> = {
  draft: Clock, pending_review: Clock, approved: AlertCircle, sent: CheckCircle2,
}

export function StrategistFridayReportsPage() {
  const { user, role } = useAuth()
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [reports, setReports] = useState<FridayReport[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<FridayReport> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const assignments = await getAssignedMembers(user.id)
    const memberIds = assignments.map((a) => a.member_id)
    if (memberIds.length > 0) {
      const { data } = await supabase.from('member_profiles').select('*').in('user_id', memberIds)
      setMembers((data as MemberProfile[]) || [])
    }
    const reportData = await getReportsForStrategist(user.id)
    setReports(reportData)
    setLoading(false)
  }

  const startNewReport = (memberId: string) => {
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    setEditing({
      user_id: memberId,
      strategist_id: user!.id,
      report_date: today.toISOString().slice(0, 10),
      reporting_period_start: weekAgo.toISOString().slice(0, 10),
      reporting_period_end: today.toISOString().slice(0, 10),
      title: `Weekly Progress Report — ${formatDate(today.toISOString())}`,
      summary: '',
      opportunities_reviewed: 0,
      applications_submitted: 0,
      interviews_scheduled: 0,
      opportunities_researched: '',
      applications_submitted_detail: '',
      interviews_detail: '',
      strategist_summary: '',
      next_steps: '',
    })
  }

  const handleGenerateFromData = async () => {
    if (!editing?.user_id || !editing.reporting_period_start || !editing.reporting_period_end) return
    const draft = await generateReportDraftData(
      editing.user_id, editing.reporting_period_start, editing.reporting_period_end
    )
    setEditing((prev) => prev && {
      ...prev,
      opportunities_reviewed: draft.opportunitiesReviewed,
      applications_submitted: draft.applicationsSubmitted,
      interviews_scheduled: draft.interviewsScheduled,
      opportunities_researched: draft.opportunitiesResearched,
      applications_submitted_detail: draft.applicationsSubmittedDetail,
      interviews_detail: draft.interviewsDetail,
    })
  }

  const handleSaveDraft = async () => {
    if (!editing) return
    setSaving(true)
    if (editing.id) {
      await updateReport(editing.id, editing)
    } else {
      await createDraftReport(editing)
    }
    setSaving(false)
    setEditing(null)
    loadData()
  }

  const handleSubmitForReview = async () => {
    if (!editing) return
    setSaving(true)
    let reportId = editing.id
    if (!reportId) {
      const created = await createDraftReport(editing)
      reportId = created?.id
    } else {
      await updateReport(reportId, editing)
    }
    if (reportId) await submitReportForReview(reportId)
    setSaving(false)
    setEditing(null)
    loadData()
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin={role === 'admin'}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  if (editing) {
    return (
      <StrategistLayout isAdmin={role === 'admin'}>
        <ReportEditor
          editing={editing}
          setEditing={setEditing}
          memberName={members.find((m) => m.user_id === editing.user_id)?.full_name || 'Member'}
          saving={saving}
          onGenerate={handleGenerateFromData}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmitForReview}
          onCancel={() => setEditing(null)}
        />
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin={role === 'admin'}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Friday Reports</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Write weekly progress reports for your members. Reports pull real activity data but never send
          automatically — an admin reviews and sends each one.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 font-serif text-base font-semibold text-neutral-900">Start a New Report</h2>
        {members.length === 0 ? (
          <p className="text-sm text-neutral-500">No assigned members yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.user_id}
                onClick={() => startNewReport(m.user_id)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-primary-300 hover:bg-primary-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {m.full_name || 'Member'}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-3 font-serif text-lg font-semibold text-neutral-900">All Reports</h2>
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">No reports yet. Pick a member above to start one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const StatusIcon = STATUS_ICONS[r.approval_status] || Clock
            const memberName = members.find((m) => m.user_id === r.user_id)?.full_name || 'Member'
            return (
              <button
                key={r.id}
                onClick={() => setEditing(r)}
                disabled={r.approval_status === 'sent'}
                className="w-full rounded-2xl border border-neutral-200 bg-white p-5 text-left transition-all hover:shadow-md disabled:cursor-default disabled:hover:shadow-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', STATUS_COLORS[r.approval_status])}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[r.approval_status] || r.approval_status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <User className="h-3.5 w-3.5" />
                        {memberName}
                      </span>
                    </div>
                    <h3 className="mt-2 font-serif text-base font-semibold text-neutral-900">{r.title}</h3>
                    <p className="text-xs text-neutral-500">{formatDate(r.report_date)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </StrategistLayout>
  )
}

interface ReportEditorProps {
  editing: Partial<FridayReport>
  setEditing: (r: Partial<FridayReport> | null) => void
  memberName: string
  saving: boolean
  onGenerate: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  onCancel: () => void
}

function ReportEditor({ editing, setEditing, memberName, saving, onGenerate, onSaveDraft, onSubmit, onCancel }: ReportEditorProps) {
  const set = (field: keyof FridayReport, value: unknown) => setEditing({ ...editing, [field]: value })
  const isLocked = editing.approval_status === 'pending_review' || editing.approval_status === 'approved'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">Report for {memberName}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {isLocked ? 'This report is with an admin for review — editing will pull it back to draft.' : 'Fill in the details below, or auto-fill from real activity data.'}
          </p>
        </div>
        <button onClick={onGenerate} className="flex items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100">
          <Sparkles className="h-4 w-4" />
          Generate From Data
        </button>
      </div>

      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Report Date" type="date" value={editing.report_date} onChange={(v) => set('report_date', v)} />
          <Field label="Period Start" type="date" value={editing.reporting_period_start ?? ''} onChange={(v) => set('reporting_period_start', v)} />
          <Field label="Period End" type="date" value={editing.reporting_period_end ?? ''} onChange={(v) => set('reporting_period_end', v)} />
        </div>
        <Field label="Title" value={editing.title} onChange={(v) => set('title', v)} />
        <TextArea label="Summary (member-facing)" value={editing.summary ?? ''} onChange={(v) => set('summary', v)} rows={2} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Opportunities Reviewed" type="number" value={String(editing.opportunities_reviewed ?? 0)} onChange={(v) => set('opportunities_reviewed', Number(v))} />
          <Field label="Applications Submitted" type="number" value={String(editing.applications_submitted ?? 0)} onChange={(v) => set('applications_submitted', Number(v))} />
          <Field label="Interviews Scheduled" type="number" value={String(editing.interviews_scheduled ?? 0)} onChange={(v) => set('interviews_scheduled', Number(v))} />
        </div>
        <TextArea label="Opportunities Researched (detail)" value={editing.opportunities_researched ?? ''} onChange={(v) => set('opportunities_researched', v)} rows={3} />
        <TextArea label="Applications Submitted (detail)" value={editing.applications_submitted_detail ?? ''} onChange={(v) => set('applications_submitted_detail', v)} rows={3} />
        <TextArea label="Interviews (detail)" value={editing.interviews_detail ?? ''} onChange={(v) => set('interviews_detail', v)} rows={3} />
        <TextArea label="Strategist Summary" value={editing.strategist_summary ?? ''} onChange={(v) => set('strategist_summary', v)} rows={3} />
        <TextArea label="Next Steps" value={editing.next_steps ?? ''} onChange={(v) => set('next_steps', v)} rows={2} />
      </div>

      <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-end gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <button onClick={onCancel} disabled={saving} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">
          Cancel
        </button>
        <button onClick={onSaveDraft} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        <button onClick={onSubmit} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit for Admin Review
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value?: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  )
}
