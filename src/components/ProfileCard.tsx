import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Camera, Loader2, Pencil, Check, X, BadgeCheck } from 'lucide-react'
import type { MemberProfile } from '@/types'

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/i

const SUBSCRIPTION_STYLES: Record<string, string> = {
  active: 'bg-success-100 text-success-700',
  paused: 'bg-warning-100 text-warning-700',
  canceled: 'bg-neutral-100 text-neutral-500',
  none: 'bg-neutral-100 text-neutral-500',
}

const SUBSCRIPTION_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  canceled: 'Canceled',
  none: 'No Subscription',
}

interface ProfileCardProps {
  userId: string
  profile: MemberProfile
  onUpdated: () => void
}

export function ProfileCard({ userId, profile, onUpdated }: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState(profile.username || '')
  const [savingUsername, setSavingUsername] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = profile.subscription_status || 'none'
  const initials = (profile.full_name || 'M').charAt(0).toUpperCase()

  const handleAvatarChange = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file for your headshot.')
      return
    }
    setUploading(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      setError('Could not upload that photo. Please try again.')
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const { error: updateError } = await supabase
      .from('member_profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('user_id', userId)
    setUploading(false)
    if (updateError) {
      console.error('Error saving avatar url:', updateError)
      setError('Photo uploaded, but we could not save it to your profile.')
      return
    }
    onUpdated()
  }

  const handleSaveUsername = async () => {
    const trimmed = usernameDraft.trim()
    if (!trimmed) {
      setEditingUsername(false)
      return
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError('Usernames must be 3-20 characters: letters, numbers, and underscores only.')
      return
    }
    setSavingUsername(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('member_profiles')
      .update({ username: trimmed.toLowerCase() })
      .eq('user_id', userId)
    setSavingUsername(false)
    if (updateError) {
      console.error('Error saving username:', updateError)
      setError(updateError.message.includes('duplicate') || updateError.code === '23505'
        ? 'That username is already taken. Try another.'
        : 'Could not save that username. Please try again.')
      return
    }
    setEditingUsername(false)
    onUpdated()
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xl font-semibold text-primary-700">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Upload profile photo"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleAvatarChange(e.target.files)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg font-semibold text-neutral-900">
            {profile.full_name || 'Your Name'}
          </p>

          {editingUsername ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-sm text-neutral-400">@</span>
              <input
                type="text"
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                autoFocus
                className="w-32 rounded-lg border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button onClick={handleSaveUsername} disabled={savingUsername} className="rounded p-1 text-primary-600 hover:bg-primary-50">
                {savingUsername ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => { setEditingUsername(false); setUsernameDraft(profile.username || '') }} className="rounded p-1 text-neutral-400 hover:bg-neutral-50">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingUsername(true)}
              className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500 hover:text-primary-700"
            >
              {profile.username ? `@${profile.username}` : 'Set a username'}
              <Pencil className="h-3 w-3" />
            </button>
          )}

          <span className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', SUBSCRIPTION_STYLES[status] || SUBSCRIPTION_STYLES.none)}>
            <BadgeCheck className="h-3 w-3" />
            {SUBSCRIPTION_LABELS[status] || status}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-700">{error}</p>
      )}
    </div>
  )
}
