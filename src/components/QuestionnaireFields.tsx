import { useState, type FormEvent } from 'react'
import type { QuestionnaireField } from '@/data/questionnaire'
import {
  Plus, X, Trash2,
  User, Briefcase, GraduationCap, Wrench, Award, Target, Ban, Building2,
  DollarSign, Heart, Clock, Car, Home, MapPin, Plane, Users, TrendingUp,
  Zap, AlertTriangle, Smile, Frown, Flame, Mountain, FileCheck, Upload,
  ClipboardCheck, ShieldCheck,
} from 'lucide-react'

export const iconMap: Record<string, typeof User> = {
  User, Briefcase, GraduationCap, Wrench, Award, Target, Ban, Building2,
  DollarSign, Heart, Clock, Car, Home, MapPin, Plane, Users, TrendingUp,
  Zap, AlertTriangle, Smile, Frown, Flame, Mountain, FileCheck, Upload,
  ClipboardCheck, ShieldCheck,
}

/**
 * Renders a single questionnaire/profile field based on its declared type.
 * Shared by the onboarding wizard and the member/admin profile editors so
 * there is exactly one implementation of each input type (DRY).
 */
export function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: QuestionnaireField
  value: unknown
  onChange: (val: unknown) => void
}) {
  const baseInput =
    'mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

  switch (field.type) {
    case 'text':
      return (
        <div>
          <label htmlFor={field.key} className="block text-sm font-medium text-neutral-700">
            {field.label}
            {field.required && <span className="ml-1 text-error-500">*</span>}
          </label>
          <input
            id={field.key}
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInput}
            aria-required={field.required}
          />
          {field.helpText && <p className="mt-1 text-xs text-neutral-500">{field.helpText}</p>}
        </div>
      )

    case 'textarea':
      return (
        <div>
          <label htmlFor={field.key} className="block text-sm font-medium text-neutral-700">
            {field.label}
            {field.required && <span className="ml-1 text-error-500">*</span>}
          </label>
          <textarea
            id={field.key}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInput}
            aria-required={field.required}
          />
          {field.helpText && <p className="mt-1 text-xs text-neutral-500">{field.helpText}</p>}
        </div>
      )

    case 'number':
      return (
        <div>
          <label htmlFor={field.key} className="block text-sm font-medium text-neutral-700">
            {field.label}
            {field.required && <span className="ml-1 text-error-500">*</span>}
          </label>
          <input
            id={field.key}
            type="number"
            value={(value as number | string) || ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className={baseInput}
            aria-required={field.required}
          />
          {field.helpText && <p className="mt-1 text-xs text-neutral-500">{field.helpText}</p>}
        </div>
      )

    case 'select':
      return (
        <div>
          <label htmlFor={field.key} className="block text-sm font-medium text-neutral-700">
            {field.label}
            {field.required && <span className="ml-1 text-error-500">*</span>}
          </label>
          <select
            id={field.key}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInput}
            aria-required={field.required}
          >
            <option value="">Select an option…</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )

    case 'multiselect':
      return (
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {field.label}
            {field.required && <span className="ml-1 text-error-500">*</span>}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {field.options?.map((opt) => {
              const selected = ((value as string[]) || []).includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const current = (value as string[]) || []
                    onChange(selected ? current.filter((v) => v !== opt) : [...current, opt])
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selected
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  aria-pressed={selected}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {field.helpText && <p className="mt-1 text-xs text-neutral-500">{field.helpText}</p>}
        </div>
      )

    case 'boolean':
      return (
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => onChange(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              aria-required={field.required}
            />
            <div>
              <span className="text-sm font-medium text-neutral-700">
                {field.label}
                {field.required && <span className="ml-1 text-error-500">*</span>}
              </span>
              {field.helpText && <p className="mt-1 text-xs text-neutral-500">{field.helpText}</p>}
            </div>
          </label>
        </div>
      )

    case 'tags':
      return <TagsInput field={field} value={(value as string[]) || []} onChange={onChange} />

    case 'employment':
      return <EmploymentInput value={(value as unknown[]) || []} onChange={onChange} />

    case 'education':
      return <EducationInput value={(value as unknown[]) || []} onChange={onChange} />

    case 'certifications':
      return <CertificationsInput value={(value as unknown[]) || []} onChange={onChange} />

    default:
      return null
  }
}

function TagsInput({
  field,
  value,
  onChange,
}: {
  field: QuestionnaireField
  value: string[]
  onChange: (val: string[]) => void
}) {
  const [input, setInput] = useState('')

  const addTag = (e: FormEvent) => {
    e.preventDefault()
    const tag = input.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInput('')
  }

  return (
    <div>
      <label htmlFor={field.key} className="block text-sm font-medium text-neutral-700">
        {field.label}
        {field.required && <span className="ml-1 text-error-500">*</span>}
      </label>
      <form onSubmit={addTag} className="mt-1 flex gap-2">
        <input
          id={field.key}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={field.placeholder}
          className="block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
      {field.helpText && <p className="mt-1 text-xs text-neutral-500">{field.helpText}</p>}
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1.5 text-sm font-medium text-primary-700"
            >
              {tag}
              <button
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary-200"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

interface EmploymentItem {
  company: string
  title: string
  start_date: string
  end_date: string | null
  current: boolean
  description: string
}

function EmploymentInput({
  value,
  onChange,
}: {
  value: unknown[]
  onChange: (val: unknown[]) => void
}) {
  const items = value as EmploymentItem[]

  const add = () => {
    onChange([
      ...items,
      { company: '', title: '', start_date: '', end_date: null, current: false, description: '' },
    ])
  }

  const update = (index: number, field: keyof EmploymentItem, val: unknown) => {
    const updated = items.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    onChange(updated)
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">
        Employment History
        <span className="ml-1 text-error-500">*</span>
      </label>
      <div className="mt-2 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Role {i + 1}</span>
              <button
                onClick={() => remove(i)}
                className="text-neutral-400 hover:text-error-600"
                aria-label="Remove role"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Job Title"
                value={item.title}
                onChange={(e) => update(i, 'title', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Company"
                value={item.company}
                onChange={(e) => update(i, 'company', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Start Date (e.g., Jan 2022)"
                value={item.start_date}
                onChange={(e) => update(i, 'start_date', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="End Date"
                  value={item.current ? 'Present' : item.end_date || ''}
                  disabled={item.current}
                  onChange={(e) => update(i, 'end_date', e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-100"
                />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={item.current}
                onChange={(e) => update(i, 'current', e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              I currently work here
            </label>
            <textarea
              placeholder="Brief description of your role and accomplishments…"
              value={item.description}
              onChange={(e) => update(i, 'description', e.target.value)}
              rows={2}
              className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-primary-400 hover:text-primary-600"
      >
        <Plus className="h-4 w-4" />
        Add Role
      </button>
    </div>
  )
}

interface EducationItem {
  institution: string
  degree: string
  field: string
  graduation_year: string | null
}

function EducationInput({
  value,
  onChange,
}: {
  value: unknown[]
  onChange: (val: unknown[]) => void
}) {
  const items = value as EducationItem[]

  const add = () => {
    onChange([...items, { institution: '', degree: '', field: '', graduation_year: null }])
  }

  const update = (index: number, field: keyof EducationItem, val: unknown) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: val } : item)))
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">Education</label>
      <div className="mt-2 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Entry {i + 1}</span>
              <button onClick={() => remove(i)} className="text-neutral-400 hover:text-error-600" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Institution"
                value={item.institution}
                onChange={(e) => update(i, 'institution', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Degree"
                value={item.degree}
                onChange={(e) => update(i, 'degree', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Field of Study"
                value={item.field}
                onChange={(e) => update(i, 'field', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Graduation Year"
                value={item.graduation_year || ''}
                onChange={(e) => update(i, 'graduation_year', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-primary-400 hover:text-primary-600"
      >
        <Plus className="h-4 w-4" />
        Add Education
      </button>
    </div>
  )
}

interface CertificationItem {
  name: string
  issuer: string
  date: string | null
  expiry: string | null
}

function CertificationsInput({
  value,
  onChange,
}: {
  value: unknown[]
  onChange: (val: unknown[]) => void
}) {
  const items = value as CertificationItem[]

  const add = () => {
    onChange([...items, { name: '', issuer: '', date: null, expiry: null }])
  }

  const update = (index: number, field: keyof CertificationItem, val: unknown) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: val } : item)))
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700">Certifications</label>
      <div className="mt-2 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Certification {i + 1}</span>
              <button onClick={() => remove(i)} className="text-neutral-400 hover:text-error-600" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Certification Name"
                value={item.name}
                onChange={(e) => update(i, 'name', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Issuing Organization"
                value={item.issuer}
                onChange={(e) => update(i, 'issuer', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Date Obtained"
                value={item.date || ''}
                onChange={(e) => update(i, 'date', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Expiration Date (if applicable)"
                value={item.expiry || ''}
                onChange={(e) => update(i, 'expiry', e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-primary-400 hover:text-primary-600"
      >
        <Plus className="h-4 w-4" />
        Add Certification
      </button>
    </div>
  )
}
