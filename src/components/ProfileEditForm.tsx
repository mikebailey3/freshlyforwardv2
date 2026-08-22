import { useEffect, useMemo, useRef, useState } from 'react'
import { questionnaireSections } from '@/data/questionnaire'
import { FieldRenderer, iconMap } from '@/components/QuestionnaireFields'
import { Check, Loader2, User, X } from 'lucide-react'
import type { MemberProfile } from '@/types'

// Sections that aren't real member_profiles columns (document upload has its
// own dedicated UI, review is onboarding-only) — skip them in the editor.
const EXCLUDED_SECTIONS = new Set(['document_upload', 'review'])

const editableSections = questionnaireSections.filter((s) => !EXCLUDED_SECTIONS.has(s.key))

function buildInitialFormData(profile: MemberProfile): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const section of editableSections) {
    for (const field of section.fields) {
      data[field.key] = (profile as unknown as Record<string, unknown>)[field.key] ?? null
    }
  }
  return data
}

interface ProfileEditFormProps {
  profile: MemberProfile
  onSave: (updates: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  focusSection?: string | null
}

export function ProfileEditForm({ profile, onSave, onCancel, focusSection }: ProfileEditFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => buildInitialFormData(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!focusSection) return
    const el = sectionRefs.current[focusSection]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Only run once on mount for the initial deep-link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateField = (fieldKey: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const sections = useMemo(() => editableSections, [])

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}

      {sections.map((section) => {
        const Icon = iconMap[section.icon] || User
        const isFocused = focusSection === section.key
        return (
          <div
            key={section.key}
            ref={(el) => { sectionRefs.current[section.key] = el }}
            className={`rounded-2xl border bg-white p-6 transition-colors ${
              isFocused ? 'border-primary-400 ring-2 ring-primary-100' : 'border-neutral-200'
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <Icon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-neutral-900">{section.title}</h3>
                <p className="text-xs text-neutral-500">{section.description}</p>
              </div>
            </div>
            <div className="space-y-5">
              {section.fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
