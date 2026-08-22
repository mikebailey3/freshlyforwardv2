import { useEffect, useState } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { getFridayReports } from '@/lib/communication'
import { formatDate, cn } from '@/lib/utils'
import {
  FileText, Loader2, Calendar, TrendingUp, Mail, Briefcase,
  ArrowLeft, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'
import type { FridayReport } from '@/types'

const approvalStatusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'In Review',
  approved: 'Approved',
  sent: 'Sent',
}

const approvalStatusColors: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  pending_review: 'bg-warning-100 text-warning-700',
  approved: 'bg-accent-100 text-accent-700',
  sent: 'bg-success-100 text-success-700',
}

const approvalStatusIcons: Record<string, typeof Clock> = {
  draft: Clock,
  pending_review: Clock,
  approved: AlertCircle,
  sent: CheckCircle2,
}

export function FridayReportsPage() {
  const { profile } = useAuth()
  const [reports, setReports] = useState<FridayReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FridayReport | null>(null)

  useEffect(() => {
    if (!profile) return
    loadReports()
  }, [profile])

  const loadReports = async () => {
    if (!profile) return
    const data = await getFridayReports(profile.id)
    // Only show approved or sent reports to members -- drafts and
    // pending-review reports are still being written/reviewed internally.
    const visible = (data as unknown as FridayReport[]).filter(
      (r) => r.approval_status === 'approved' || r.approval_status === 'sent'
    )
    setReports(visible)
    setLoading(false)
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Friday Progress Reports
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          A weekly summary of your career search progress, prepared by your Career Strategist every Friday.
        </p>
      </div>

      {selected ? (
        <ReportDetail report={selected} onBack={() => setSelected(null)} />
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            No Friday Progress Reports are available yet. Your first report will appear here after your
            strategist completes it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-neutral-900">Recent Reports</h2>
          {reports.map((report) => {
            const StatusIcon = approvalStatusIcons[report.approval_status] || Clock
            return (
              <button
                key={report.id}
                onClick={() => setSelected(report)}
                className="w-full rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                          approvalStatusColors[report.approval_status] || 'bg-neutral-100 text-neutral-600'
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {approvalStatusLabels[report.approval_status] || report.approval_status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(report.report_date)}
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-lg font-semibold text-neutral-900">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{report.summary}</p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-neutral-600">
                        <TrendingUp className="h-4 w-4 text-primary-600" />
                        {report.opportunities_reviewed} opportunities reviewed
                      </span>
                      <span className="flex items-center gap-1.5 text-neutral-600">
                        <Mail className="h-4 w-4 text-primary-600" />
                        {report.applications_submitted} applications submitted
                      </span>
                      <span className="flex items-center gap-1.5 text-neutral-600">
                        <Briefcase className="h-4 w-4 text-primary-600" />
                        {report.interviews_scheduled} interviews scheduled
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </MemberLayout>
  )
}

function ReportDetail({ report, onBack }: { report: FridayReport; onBack: () => void }) {
  const StatusIcon = approvalStatusIcons[report.approval_status] || Clock

  const sections: { label: string; icon: typeof Calendar; content: string | null }[] = [
    {
      label: 'Reporting Period',
      icon: Calendar,
      content:
        report.reporting_period_start && report.reporting_period_end
          ? `${formatDate(report.reporting_period_start)} — ${formatDate(report.reporting_period_end)}`
          : null,
    },
    { label: 'Strategist Summary', icon: FileText, content: report.strategist_summary },
    { label: 'Opportunities Researched', icon: TrendingUp, content: report.opportunities_researched },
    { label: 'Applications Submitted', icon: Mail, content: report.applications_submitted_detail },
    { label: 'Interviews', icon: Briefcase, content: report.interviews_detail },
  ]

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all reports
      </button>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-5">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
              approvalStatusColors[report.approval_status] || 'bg-neutral-100 text-neutral-600'
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {approvalStatusLabels[report.approval_status] || report.approval_status}
          </span>
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(report.report_date)}
          </span>
        </div>

        <h2 className="mt-5 font-serif text-2xl font-semibold text-neutral-900">
          {report.title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{report.summary}</p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-primary-50 p-4">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            <p className="mt-2 text-2xl font-semibold text-neutral-900">
              {report.opportunities_reviewed}
            </p>
            <p className="text-xs text-neutral-500">Opportunities Reviewed</p>
          </div>
          <div className="rounded-xl bg-primary-50 p-4">
            <Mail className="h-5 w-5 text-primary-600" />
            <p className="mt-2 text-2xl font-semibold text-neutral-900">
              {report.applications_submitted}
            </p>
            <p className="text-xs text-neutral-500">Applications Submitted</p>
          </div>
          <div className="rounded-xl bg-primary-50 p-4">
            <Briefcase className="h-5 w-5 text-primary-600" />
            <p className="mt-2 text-2xl font-semibold text-neutral-900">
              {report.interviews_scheduled}
            </p>
            <p className="text-xs text-neutral-500">Interviews Scheduled</p>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-6 space-y-5">
          {sections
            .filter((s) => s.content)
            .map((section) => (
              <div key={section.label}>
                <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-neutral-900">
                  <section.icon className="h-4 w-4 text-primary-600" />
                  {section.label}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-600">
                  {section.content}
                </p>
              </div>
            ))}
        </div>

        {/* Next Steps */}
        {report.next_steps && (
          <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5">
            <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-primary-800">
              <CheckCircle2 className="h-4 w-4" />
              Next Steps
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-primary-800">
              {report.next_steps}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
