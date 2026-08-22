import { useEffect, useState, type FormEvent } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { getCommPrefs, ensureCommPrefs, updateCommPrefs } from '@/lib/communication'
import { Bell, Mail, MessageSquare, Calendar, Newspaper, Tag, Loader2 } from 'lucide-react'
import type { CommunicationPreferences } from '@/types'

interface PrefRow {
  key: keyof CommunicationPreferences
  label: string
  desc: string
  icon: typeof Bell
  future?: boolean
}

const prefRows: PrefRow[] = [
  { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive updates and alerts by email.', icon: Mail },
  { key: 'weekly_digest', label: 'Weekly Digest', desc: 'A summary of your week every Friday.', icon: Newspaper },
  { key: 'immediate_alerts', label: 'Immediate Alerts', desc: 'Instant notifications for important events.', icon: Bell },
  { key: 'marketing_emails', label: 'Marketing Emails', desc: 'Occasional product news and announcements.', icon: Tag },
  { key: 'sms_notifications', label: 'SMS Notifications', desc: 'Text messages for urgent alerts.', icon: MessageSquare, future: true },
  { key: 'browser_notifications', label: 'Browser Notifications', desc: 'Push notifications in your browser.', icon: Bell, future: true },
]

export function CommunicationPreferencesPage() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<CommunicationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    ensureCommPrefs(user.id).then((p) => {
      setPrefs(p)
      setLoading(false)
    })
  }, [user])

  const handleToggle = async (key: keyof CommunicationPreferences) => {
    if (!user || !prefs) return
    const newVal = !prefs[key]
    setPrefs({ ...prefs, [key]: newVal })
    setSaving(key)
    await updateCommPrefs(user.id, { [key]: newVal })
    setSaving(null)
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
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Communication Preferences</h1>
        <p className="mt-1 text-sm text-neutral-600">Choose how and when FreshlyForward contacts you.</p>
      </div>

      <div className="max-w-xl space-y-3">
        {prefRows.map((row) => {
          const value = prefs ? (prefs[row.key] as boolean) : false
          return (
            <div key={row.key} className={`flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5 ${row.future ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                  <row.icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-900">{row.label}</p>
                    {row.future && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">Coming Soon</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">{row.desc}</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={value}
                aria-label={`Toggle ${row.label}`}
                disabled={row.future || saving === row.key}
                onClick={() => handleToggle(row.key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:cursor-not-allowed ${value ? 'bg-primary-600' : 'bg-neutral-200'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Changes are saved automatically. You can update these preferences at any time.
      </p>
    </MemberLayout>
  )
}
