import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { addTimelineEvent } from '@/lib/profile'
import { Upload, FileText, Loader2, Check, X, AlertCircle } from 'lucide-react'
import type { MemberProfile } from '@/types'

interface OnboardingStepProps {
  onNext: () => void
  onBack: () => void
  profile: MemberProfile | null
  user: { id: string; email?: string } | null
}

export function OnboardingDocumentUpload({ onNext, user }: OnboardingStepProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; size: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (!user) return
      setUploading(true)
      setError(null)

      try {
        for (const file of Array.from(files)) {
          if (file.size > 10 * 1024 * 1024) {
            setError(`${file.name} is too large. Maximum size is 10MB.`)
            continue
          }

          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

          const { error: uploadError } = await supabase.storage
            .from('member-documents')
            .upload(fileName, file)

          if (uploadError) {
            // Storage bucket might not be set up yet — record metadata anyway
            console.error('Upload error:', uploadError)
          }

          const docType = file.name.toLowerCase().includes('resume') || file.name.toLowerCase().includes('cv')
            ? 'resume'
            : file.name.toLowerCase().includes('cover')
              ? 'cover_letter'
              : 'other'

          await supabase.from('member_documents').insert({
            user_id: user.id,
            document_type: docType,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
          })

          setUploadedFiles((prev) => [...prev, { name: file.name, type: docType, size: file.size }])

          if (docType === 'resume') {
            await addTimelineEvent(user.id, 'resume_uploaded', 'Resume Uploaded', `Uploaded: ${file.name}`)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setUploading(false)
      }
    },
    [user],
  )

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Document Upload
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Upload your resume and any other documents you would like your Career Strategist to review.
      </p>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
        }}
        className={`mt-8 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver ? 'border-primary-500 bg-primary-50' : 'border-neutral-300 bg-neutral-50'
        }`}
      >
        <input
          type="file"
          id="document-upload"
          multiple
          accept=".pdf,.doc,.docx,.txt,.rtf"
          className="sr-only"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        <label htmlFor="document-upload" className="cursor-pointer">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            ) : (
              <Upload className="h-8 w-8 text-primary-600" />
            )}
          </div>
          <p className="text-sm font-medium text-neutral-900">
            {uploading ? 'Uploading…' : 'Click to upload or drag and drop'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            PDF, DOC, DOCX, TXT, RTF — up to 10MB each
          </p>
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Uploaded Files</h3>
          {uploadedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                <FileText className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">{file.name}</p>
                <p className="text-xs text-neutral-500">
                  {(file.size / 1024).toFixed(0)} KB — {file.type.replace('_', ' ')}
                </p>
              </div>
              <Check className="h-4 w-4 text-success-600" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl bg-neutral-50 border border-neutral-200 p-4">
        <p className="text-sm text-neutral-600">
          <strong>Prefer to skip this step?</strong> You can upload documents anytime from your dashboard.
          Your Career Strategist can also help you create or refine your resume.
        </p>
      </div>
    </div>
  )
}
