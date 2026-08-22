import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StrategistLayout } from '@/components/StrategistLayout'
import { getAllPostsForStaff, deletePost } from '@/lib/blog'
import { cn, formatDate } from '@/lib/utils'
import {
  Newspaper, Plus, Search, Pencil, Trash2, Loader2, AlertCircle,
} from 'lucide-react'
import type { BlogPost, BlogPostStatus } from '@/types'

type StatusTab = 'all' | BlogPostStatus

const STATUS_BADGE: Record<BlogPostStatus, string> = {
  published: 'bg-success-100 text-success-700',
  draft: 'bg-neutral-100 text-neutral-600',
  scheduled: 'bg-warning-100 text-warning-700',
}

export function BlogManagementPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    const data = await getAllPostsForStaff()
    setPosts(data)
    setLoading(false)
  }

  const counts = useMemo(() => {
    return {
      all: posts.length,
      published: posts.filter((p) => p.status === 'published').length,
      draft: posts.filter((p) => p.status === 'draft').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
    }
  }, [posts])

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesStatus = statusTab === 'all' || post.status === statusTab
      const matchesSearch = !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [posts, statusTab, searchQuery])

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return
    setDeletingId(post.id)
    const { error } = await deletePost(post.id)
    if (error) {
      setError(error)
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    }
    setDeletingId(null)
  }

  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'published', label: `Published (${counts.published})` },
    { key: 'draft', label: `Drafts (${counts.draft})` },
    { key: 'scheduled', label: `Scheduled (${counts.scheduled})` },
  ]

  if (loading) {
    return (
      <StrategistLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  return (
    <StrategistLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">Blog Posts</h1>
          <p className="mt-1 text-sm text-neutral-600">Manage everything published to The Forward Feed.</p>
        </div>
        <button
          onClick={() => navigate('/strategist/blog-posts/new')}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add New Post
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                statusTab === tab.key ? 'bg-primary-50 text-primary-700' : 'text-neutral-500 hover:bg-neutral-50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            aria-label="Search posts by title"
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-64"
          />
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <Newspaper className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm text-neutral-500">
            {posts.length === 0 ? 'No posts yet. Write the first one!' : 'No posts match your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Author</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Published</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-neutral-50">
                  <td className="max-w-xs truncate px-5 py-3.5 font-medium text-neutral-900">{post.title}</td>
                  <td className="px-5 py-3.5 text-neutral-600">{post.category}</td>
                  <td className="px-5 py-3.5 text-neutral-600">{post.author_name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_BADGE[post.status])}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-500">
                    {post.published_at ? formatDate(post.published_at) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/strategist/blog-posts/${post.id}`}
                        className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(post)}
                        disabled={deletingId === post.id}
                        className="flex items-center gap-1 rounded-lg border border-error-200 px-2.5 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StrategistLayout>
  )
}
