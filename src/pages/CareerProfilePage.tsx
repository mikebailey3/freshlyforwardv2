import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MemberLayout } from '@/components/MemberLayout'
import { SearchReadinessWidget } from '@/components/SearchReadinessWidget'
import { ProfileEditForm } from '@/components/ProfileEditForm'
import { ProfileCard as MemberProfileCard } from '@/components/ProfileCard'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ensureProfile, calculateSearchReadiness } from '@/lib/profile'
import {
  User, Briefcase, GraduationCap, Award, Wrench, Target, DollarSign,
  Clock, MapPin, TrendingUp, FileCheck, FileText, Upload, Loader2, Pencil,
} from 'lucide-react'
import type { MemberProfile, MemberDocument } from '@/types'

export function CareerProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [documents, setDocuments] = useState<MemberDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const editing = searchParams.get('edit') === '1'
  const focusSection = searchParams.get('focus')

  useEffect(() => {
    if (!user) return
    ensureProfile(user.id).then(async () => {
      await refreshProfile()
      const { data } = await supabase
        .from('member_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
      setDocuments((data as MemberDocument[]) || [])
      setLoading(false)
    })
  }, [user, refreshProfile])

  const handleUpload = async (files: FileList) => {
    if (!user) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      await supabase.storage.from('member-documents').upload(fileName, file).catch(() => {})
      const docType = file.name.toLowerCase().includes('resume') || file.name.toLowerCase().includes('cv')
        ? 'resume' : 'other'
      await supabase.from('member_documents').insert({
        user_id: user.id, document_type: docType, file_name: file.name,
        file_path: fileName, file_size: file.size, mime_type: file.type,
      })
    }
    const { data } = await supabase
      .from('member_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
    setDocuments((data as MemberDocument[]) || [])
    setUploading(false)
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

  const p = profile as MemberProfile | null

  const startEditing = () => setSearchParams({ edit: '1' })
  const stopEditing = () => setSearchParams({})

  const handleSaveProfile = async (updates: Record<string, unknown>) => {
    if (!user || !p) return
    const merged = { ...p, ...updates } as MemberProfile
    const { score } = calculateSearchReadiness(merged)
    const { error } = await supabase
      .from('member_profiles')
      .update({ ...updates, search_readiness_score: score })
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await refreshProfile()
    stopEditing()
  }

  if (editing && p) {
    return (
      <MemberLayout>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Edit Career Profile</h1>
            <p className="mt-1 text-sm text-neutral-600">Update any section below, then save your changes.</p>
          </div>
        </div>
        <ProfileEditForm
          profile={p}
          focusSection={focusSection}
          onSave={handleSaveProfile}
          onCancel={stopEditing}
        />
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Career Profile</h1>
          <p className="mt-1 text-sm text-neutral-600">Your complete career profile, built from your questionnaire.</p>
        </div>
        <button
          onClick={startEditing}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Pencil className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Career Snapshot */}
          <ProfileCard icon={User} title="Career Snapshot">
            <div className="space-y-3">
              <ProfileField label="Full Name" value={p?.full_name} />
              <ProfileField label="Headline" value={p?.headline} />
              <ProfileField label="Location" value={p?.location} />
              <ProfileField label="Phone" value={p?.phone} />
              <ProfileField label="LinkedIn" value={p?.linkedin_url} link />
              <ProfileField label="Portfolio" value={p?.portfolio_url} link />
              <div>
                <p className="text-xs font-semibold text-neutral-500">Summary</p>
                <p className="mt-1 text-sm text-neutral-700">{p?.summary || 'Not provided yet.'}</p>
              </div>
            </div>
          </ProfileCard>

          {/* Employment History */}
          <ProfileCard icon={Briefcase} title="Employment History">
            {p?.employment_history && p.employment_history.length > 0 ? (
              <div className="space-y-4">
                {p.employment_history.map((job, i) => (
                  <div key={i} className="border-l-2 border-primary-200 pl-4">
                    <p className="text-sm font-semibold text-neutral-900">{job.title}</p>
                    <p className="text-sm text-neutral-600">{job.company}</p>
                    <p className="text-xs text-neutral-500">
                      {job.start_date} — {job.current ? 'Present' : job.end_date || 'N/A'}
                    </p>
                    {job.description && <p className="mt-1 text-sm text-neutral-600">{job.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No employment history added yet." />
            )}
          </ProfileCard>

          {/* Education */}
          <ProfileCard icon={GraduationCap} title="Education">
            {p?.education && p.education.length > 0 ? (
              <div className="space-y-3">
                {p.education.map((edu, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold text-neutral-900">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</p>
                    <p className="text-sm text-neutral-600">{edu.institution}</p>
                    {edu.graduation_year && <p className="text-xs text-neutral-500">Graduated: {edu.graduation_year}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No education entries yet." />
            )}
          </ProfileCard>

          {/* Certifications */}
          <ProfileCard icon={Award} title="Credentials & Certifications">
            {p?.certifications && p.certifications.length > 0 ? (
              <div className="space-y-2">
                {p.certifications.map((cert, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Award className="mt-0.5 h-4 w-4 text-primary-600" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{cert.name}</p>
                      <p className="text-xs text-neutral-600">{cert.issuer}{cert.date ? ` — ${cert.date}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No certifications added yet." />
            )}
          </ProfileCard>

          {/* Skills */}
          <ProfileCard icon={Wrench} title="Skills">
            {p?.skills && p.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {p.skills.map((skill, i) => (
                  <span key={i} className="rounded-full bg-primary-100 px-3 py-1.5 text-sm font-medium text-primary-700">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState text="No skills added yet." />
            )}
          </ProfileCard>

          {/* Job Preferences */}
          <ProfileCard icon={Target} title="Job Preferences">
            <div className="space-y-3">
              <ProfileField label="Preferred Job Titles" value={p?.preferred_jobs?.join(', ')} />
              <ProfileField label="Jobs to Avoid" value={p?.jobs_to_avoid?.join(', ')} />
              <ProfileField label="Preferred Industries" value={p?.preferred_industries?.join(', ')} />
            </div>
          </ProfileCard>

          {/* Compensation */}
          <ProfileCard icon={DollarSign} title="Compensation">
            <div className="space-y-3">
              <ProfileField
                label="Salary Range"
                value={p?.salary_min && p?.salary_max ? `$${p.salary_min.toLocaleString()} — $${p.salary_max.toLocaleString()}/yr` : undefined}
              />
              <ProfileField label="Preferred Benefits" value={p?.preferred_benefits?.join(', ')} />
            </div>
          </ProfileCard>

          {/* Availability */}
          <ProfileCard icon={Clock} title="Availability">
            <div className="space-y-3">
              <ProfileField label="Schedule Preference" value={p?.schedule_preference} />
              <ProfileField label="Max Commute" value={p?.max_commute_minutes ? `${p.max_commute_minutes} min` : undefined} />
              <ProfileField label="Remote Preference" value={p?.remote_preference} />
              <ProfileField label="Willing to Relocate" value={p?.willing_to_relocate ? 'Yes' : 'No'} />
              <ProfileField label="Travel Willingness" value={p?.travel_willingness} />
              <ProfileField label="Work Style" value={p?.work_style} />
            </div>
          </ProfileCard>

          {/* Career Goals */}
          <ProfileCard icon={TrendingUp} title="Career Goals">
            <div className="space-y-3">
              <ProfileField label="Career Goals" value={p?.career_goals} multiline />
              <ProfileField label="Strengths" value={p?.strengths} multiline />
              <ProfileField label="Areas for Growth" value={p?.weaknesses} multiline />
              <ProfileField label="What Motivates You" value={p?.motivators} multiline />
              <ProfileField label="Biggest Career Challenge" value={p?.biggest_challenge} multiline />
            </div>
          </ProfileCard>

          {/* Authorization */}
          <ProfileCard icon={FileCheck} title="Authorization">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${p?.application_authorized ? 'bg-success-500' : 'bg-neutral-300'}`} />
                <span className="text-sm text-neutral-700">Application Authorization {p?.application_authorized ? '✓' : 'Not given'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${p?.electronic_consent ? 'bg-success-500' : 'bg-neutral-300'}`} />
                <span className="text-sm text-neutral-700">Electronic Consent {p?.electronic_consent ? '✓' : 'Not given'}</span>
              </div>
            </div>
          </ProfileCard>

          {/* Documents */}
          <ProfileCard icon={FileText} title="Documents">
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
                    <FileText className="h-4 w-4 text-neutral-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{doc.file_name}</p>
                      <p className="text-xs text-neutral-500">{doc.document_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No documents uploaded yet." />
            )}
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-primary-400 hover:text-primary-600">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Upload Document'}
              <input
                type="file"
                className="sr-only"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </label>
          </ProfileCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {p && <MemberProfileCard userId={user!.id} profile={p} onUpdated={refreshProfile} />}
          <SearchReadinessWidget profile={p} />
        </div>
      </div>
    </MemberLayout>
  )
}

function ProfileCard({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
        <h3 className="font-serif text-base font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ProfileField({ label, value, link, multiline }: { label: string; value?: string | null; link?: boolean; multiline?: boolean }) {
  if (!value) {
    return (
      <div>
        <p className="text-xs font-semibold text-neutral-500">{label}</p>
        <p className="mt-1 text-sm text-neutral-400">Not provided yet</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-primary-600 hover:underline">
          {value}
        </a>
      ) : multiline ? (
        <p className="mt-1 text-sm text-neutral-700">{value}</p>
      ) : (
        <p className="mt-1 text-sm text-neutral-700">{value}</p>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-neutral-400">{text}</p>
}
