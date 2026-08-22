import { useEffect, useState } from 'react'
import { StrategistLayout } from '@/components/StrategistLayout'
import { supabase } from '@/lib/supabase'
import { getReportsPendingReview, approveReport, requestReportChanges, sendFridayReport } from '@/lib/fridayReports'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/utils'
import { FileText, Loader2, CheckCircle2, XCircle, Send, User, Calendar } from 'lucide-react'
import type { FridayReport, MemberProfile } from '@/types'

export function AdminReportReviewPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState<FridayReport[]>([])
  const [approved, setApproved] = useState<FridayReport[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const pending = await getReportsPendingReview()
    const { data: approvedData } = await supabase
      .from('friday_reports')
      .select('*')
      .eq('approval_status', 'approved')
      .order('report_date', { ascending: true })

    const all = [...pending, ...((approvedData as FridayReport[]) || [])]
    const memberIds = Array.from(new Set(all.map((r) => r.user_id)))
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase.from('member_profiles').select('user_id, full_name').in('user_id', memberIds)
      const map: Record<string, string> = {}
      for (const p of (profiles ?? []) as Pick<MemberProfile, 'user_id' | 'full_name'>[]) {
        map[p.user_id] = p.full_name || 'Member'
      }
      setMemberMap(map)
    }
    setReports(pending)
    setApproved((approvedData as FridayReport[]) || [])
    setLoading(false)
  }

  const handleApprove = async (id: string) => {
    if (!user) return
    setActingId(id)
    await approveReport(id, user.id)
    setActingId(null)
    loadData()
  }

  const handleRequestChanges = async (id: string) => {
    if (!user) return
    const notes = notesDraft[id]?.trim()
    if (!notes) {
      setError('Add a note explaining what needs to change before sending it back.')
      return
    }
    setError(null)
    setActingId(id)
    await requestReportChanges(id, user.id, notes)
    setActingId(null)
    loadData()
  }

  const handleSend = async (id: string) => {
    setActingId(id)
    setError(null)
    const { error: sendError } = await sendFridayReport(id)
    setActingId(null)
    if (sendError) {
      setError(sendError)
      return
    }
    loadData()
  }

  if (loading) {
    return (
      <StrategistLayout isAdmin>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout isAdmin>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Friday Report Review</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Reports never reach a member automatically. Review each one, approve it, and add anything a
          strategist might have missed before sending.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700">
          {error}
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-serif text-lg font-semibold text-neutral-900">Pending Review ({reports.length})</h2>
        {reports.length === 0 ? (
          <EmptyState text="Nothing waiting on review right now." />
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-neutral-200 bg-white p-6">
                <ReportSummary report={r} memberName={memberMap[r.user_id]} />
                <textarea
                  value={notesDraft[r.id] ?? ''}
                  onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Optional: notes for the strategist if you're sending this back for changes..."
                  rows={2}
                  className="mt-4 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={actingId === r.id}
                    className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {actingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequestChanges(r.id)}
                    disabled={actingId === r.id}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Send Back for Changes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-neutral-900">Approved — Ready to Send ({approved.length})</h2>
        {approved.length === 0 ? (
          <EmptyState text="No approved reports waiting to be sent." />
        ) : (
          <div className="space-y-4">
            {approved.map((r) => (
              <div key={r.id} className="rounded-2xl border border-accent-200 bg-accent-50/40 p-6">
                <ReportSummary report={r} memberName={memberMap[r.user_id]} />
                <button
                  onClick={() => handleSend(r.id)}
                  disabled={actingId === r.id}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-60"
                >
                  {actingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send to Member
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </StrategistLayout>
  )
}

function ReportSummary({ report, memberName }: { report: FridayReport; memberName?: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{memberName || 'Member'}</span>
        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(report.report_date)}</span>
      </div>
      <h3 className="mt-2 font-serif text-lg font-semibold text-neutral-900">{report.title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{report.summary}</p>
      {report.strategist_summary && (
        <p className="mt-2 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">{report.strategist_summary}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
        <span>{report.opportunities_reviewed} opportunities reviewed</span>
        <span>{report.applications_submitted} applications submitted</span>
        <span>{report.interviews_scheduled} interviews scheduled</span>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <FileText className="mx-auto h-10 w-10 text-neutral-300" />
      <p className="mt-3 text-sm text-neutral-500">{text}</p>
    </div>
  )
}
