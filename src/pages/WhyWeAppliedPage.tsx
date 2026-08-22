import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MemberLayout } from '@/components/MemberLayout'
import { getWhyWeApplied } from '@/lib/operations'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, Loader2, MapPin, DollarSign, Calendar, ExternalLink,
  FileText, Mail, User, AlertCircle, CheckCircle2, Briefcase,
} from 'lucide-react'
import type { WhyWeApplied } from '@/types'

const statusColors: Record<string, string> = {
  submitted: 'bg-primary-600 text-white',
  employer_viewed: 'bg-primary-100 text-primary-700',
  interview_scheduled: 'bg-primary-600 text-white',
  offer_received: 'bg-success-100 text-success-700',
  rejected: 'bg-error-100 text-error-700',
}

export function WhyWeAppliedPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const [data, setData] = useState<WhyWeApplied | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!applicationId) return
    getWhyWeApplied(applicationId).then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [applicationId])

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </MemberLayout>
    )
  }

  if (!data) {
    return (
      <MemberLayout>
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">Why We Applied details are not available yet.</p>
          <Link to="/applications" className="mt-4 inline-block text-primary-600 hover:underline">
            Back to Applications
          </Link>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <Link to="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[data.current_status] || 'bg-neutral-100 text-neutral-700'}`}>
            {data.current_status.replace(/_/g, ' ')}
          </span>
        </div>

        <h1 className="mt-4 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Why We Applied
        </h1>
        <p className="mt-2 text-lg text-neutral-600">
          {data.position_title} at {data.employer}
        </p>

        {/* Key Details */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.location && (
            <DetailCard icon={MapPin} label="Location" value={data.location} />
          )}
          {data.salary_text && (
            <DetailCard icon={DollarSign} label="Salary" value={data.salary_text} />
          )}
          {data.application_date && (
            <DetailCard icon={Calendar} label="Applied" value={formatDate(data.application_date)} />
          )}
          {data.strategist_name && (
            <DetailCard icon={User} label="Strategist" value={data.strategist_name} />
          )}
        </div>

        {/* Posting Link */}
        {data.posting_link && (
          <div className="mt-6">
            <a
              href={data.posting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Original Posting
            </a>
          </div>
        )}

        {/* Why We Selected This Job */}
        {data.why_selected && (
          <Section title="Why We Selected This Job" icon={CheckCircle2}>
            <p className="text-sm text-neutral-700">{data.why_selected}</p>
          </Section>
        )}

        {/* How It Matches Experience */}
        {data.how_it_matches && (
          <Section title="How It Matches Your Experience" icon={Briefcase}>
            <p className="text-sm text-neutral-700">{data.how_it_matches}</p>
          </Section>
        )}

        {/* Skills Highlighted */}
        {data.skills_highlighted && (
          <Section title="Skills We Highlighted" icon={User}>
            <p className="text-sm text-neutral-700">{data.skills_highlighted}</p>
          </Section>
        )}

        {/* Documents Used */}
        <Section title="Documents Used" icon={FileText}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3">
              <FileText className="h-4 w-4 text-primary-600" />
              <span className="text-sm text-neutral-700">Resume: {data.resume_version_title || 'Master Resume'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3">
              <Mail className="h-4 w-4 text-primary-600" />
              <span className="text-sm text-neutral-700">Cover Letter: {data.cover_letter_title || 'Custom Cover Letter'}</span>
            </div>
          </div>
        </Section>

        {/* Potential Challenges */}
        {data.potential_challenges && (
          <Section title="Potential Challenges" icon={AlertCircle}>
            <p className="text-sm text-neutral-700">{data.potential_challenges}</p>
          </Section>
        )}

        {/* Interview Prep Notes */}
        {data.interview_prep_notes && (
          <Section title="Interview Preparation Notes" icon={User}>
            <p className="text-sm text-neutral-700">{data.interview_prep_notes}</p>
          </Section>
        )}
      </div>
    </MemberLayout>
  )
}

function DetailCard({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-neutral-400" />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-neutral-200 pt-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary-600" />
        <h2 className="font-serif text-base font-semibold text-neutral-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}
