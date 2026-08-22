import { useEffect, useState, useRef, type FormEvent } from 'react'
import { MemberLayout } from '@/components/MemberLayout'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'
import {
  MessageSquare, Send, Loader2, User, Search, Pin, Archive,
  Paperclip, Check, X, AlertCircle, FileText, Image as ImageIcon,
} from 'lucide-react'
import type { Message } from '@/types'

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.zip', '.rar', '.7z', '.tar', '.gz', '.js', '.ts', '.py', '.rb']
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface ConversationInfo {
  id: string
  member_id: string
  strategist_id: string | null
  last_message_at: string
  is_archived: boolean
  is_pinned: boolean
}

type FilterKey = 'all' | 'unread' | 'pinned' | 'archived'

export function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationInfo[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [attachment, setAttachment] = useState<{ name: string; url: string; type: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user])

  const loadConversations = async () => {
    if (!user) return
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`member_id.eq.${user.id},strategist_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    const convs = (data ?? []) as ConversationInfo[]
    setConversations(convs)

    if (convs.length > 0 && !activeConversation) {
      const nonArchived = convs.find((c) => !c.is_archived)
      if (nonArchived) setActiveConversation(nonArchived)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!activeConversation) return
    loadMessages(activeConversation.id)
  }, [activeConversation])

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    const msgs = (data ?? []) as Message[]
    setMessages(msgs)

    const receivedUnread = msgs.filter((m) => m.sender_type !== 'member' && !m.is_read)
    if (receivedUnread.length > 0 && user) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', receivedUnread.map((m) => m.id))
      setMessages((prev) => prev.map((m) => (receivedUnread.some((r) => r.id === m.id) ? { ...m, is_read: true } : m)))
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleFileSelect = async (file: File) => {
    setError(null)
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      setError('This file type is not allowed.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.')
      return
    }

    setUploading(true)
    if (!user) return
    const filePath = `${user.id}/messages/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('member-documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
    }

    const { data: urlData } = supabase.storage.from('member-documents').getPublicUrl(filePath)
    setAttachment({ name: file.name, url: urlData.publicUrl, type: file.type })
    setUploading(false)
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !activeConversation || (!body.trim() && !attachment)) return
    setSending(true)
    setError(null)

    const { data: msg } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        conversation_id: activeConversation.id,
        sender_type: 'member',
        body: body.trim(),
        is_read: false,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.name || null,
        attachment_type: attachment?.type || null,
      })
      .select('*')
      .single()

    if (msg) {
      setMessages((prev) => [...prev, msg as Message])
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation.id)
      setBody('')
      setAttachment(null)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    setSending(false)
  }

  const togglePin = async (conv: ConversationInfo) => {
    await supabase.from('conversations').update({ is_pinned: !conv.is_pinned }).eq('id', conv.id)
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, is_pinned: !c.is_pinned } : c)))
    if (activeConversation?.id === conv.id) setActiveConversation({ ...conv, is_pinned: !conv.is_pinned })
  }

  const toggleArchive = async (conv: ConversationInfo) => {
    await supabase.from('conversations').update({ is_archived: !conv.is_archived }).eq('id', conv.id)
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, is_archived: !c.is_archived } : c)))
    if (activeConversation?.id === conv.id) {
      const next = conversations.find((c) => c.id !== conv.id && !c.is_archived && !conv.is_archived)
      setActiveConversation(next || null)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'archived') return c.is_archived
    if (filter === 'pinned') return c.is_pinned && !c.is_archived
    if (filter === 'unread') return !c.is_archived
    return !c.is_archived
  })

  const filteredMessages = search
    ? messages.filter((m) => m.body.toLowerCase().includes(search.toLowerCase()))
    : messages

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
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-neutral-600">Direct communication with your Career Strategist.</p>
      </div>

      <div className="flex h-[calc(100vh-16rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {/* Conversation list */}
        <div className="flex w-full flex-col border-r border-neutral-200 sm:w-80 lg:w-96">
          {/* Filters + search */}
          <div className="border-b border-neutral-200 p-3">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages…"
                className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                aria-label="Search messages"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'unread', 'pinned', 'archived'] as FilterKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === f ? 'bg-primary-50 text-primary-700' : 'text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                No conversations.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const unreadCount = messages.filter((m) => m.conversation_id === conv.id && m.sender_type !== 'member' && !m.is_read).length
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`flex w-full items-center gap-3 border-b border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 ${
                      activeConversation?.id === conv.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100">
                      <User className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">Your Career Strategist</p>
                      <p className="truncate text-xs text-neutral-500">{timeAgo(conv.last_message_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.is_pinned && <Pin className="h-3.5 w-3.5 text-primary-600" fill="currentColor" />}
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className="hidden flex-1 flex-col sm:flex">
          {!activeConversation ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageSquare className="mb-3 h-12 w-12 text-neutral-300" />
              <p className="text-sm text-neutral-500">Select a conversation to start messaging.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between border-b border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                    <User className="h-4 w-4 text-neutral-500" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">Your Career Strategist</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePin(activeConversation)}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-primary-600"
                    aria-label={activeConversation.is_pinned ? 'Unpin conversation' : 'Pin conversation'}
                  >
                    <Pin className={`h-4 w-4 ${activeConversation.is_pinned ? 'text-primary-600' : ''}`} fill={activeConversation.is_pinned ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => toggleArchive(activeConversation)}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                    aria-label={activeConversation.is_archived ? 'Unarchive conversation' : 'Archive conversation'}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="text-sm text-neutral-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'member' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-2 max-w-[80%] ${msg.sender_type === 'member' ? 'flex-row-reverse' : ''}`}>
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100">
                            <User className="h-4 w-4 text-neutral-500" />
                          </div>
                          <div>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm ${
                                msg.sender_type === 'member'
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-neutral-100 text-neutral-900'
                              }`}
                            >
                              {msg.body}
                              {msg.attachment_url && (
                                <div className={`mt-2 flex items-center gap-2 rounded-lg p-2 text-xs ${
                                  msg.sender_type === 'member' ? 'bg-primary-700' : 'bg-neutral-200'
                                }`}>
                                  {msg.attachment_type?.startsWith('image/') ? (
                                    <ImageIcon className="h-4 w-4" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="underline">
                                    {msg.attachment_name}
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className={`mt-1 flex items-center gap-1 text-xs text-neutral-400 ${msg.sender_type === 'member' ? 'justify-end' : ''}`}>
                              <time dateTime={msg.created_at}>{timeAgo(msg.created_at)}</time>
                              {msg.sender_type === 'member' && msg.is_read && (
                                <Check className="h-3 w-3 text-primary-500" aria-label="Read" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-error-50 border border-error-100 px-3 py-2 text-xs text-error-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              {/* Attachment preview */}
              {attachment && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2 text-xs">
                  <FileText className="h-3.5 w-3.5 text-primary-600" />
                  <span className="flex-1 text-primary-700">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="text-neutral-400 hover:text-error-600" aria-label="Remove attachment">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-neutral-200 p-3">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-full p-2 text-neutral-400 hover:bg-neutral-50 hover:text-primary-600" aria-label="Attach file">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.gif,.webp"
                    />
                  </label>
                  <input
                    type="text"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    aria-label="Message input"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!body.trim() && !attachment)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                    aria-label="Send message"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </MemberLayout>
  )
}
