import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StrategistLayout } from '@/components/StrategistLayout'
import { useAuth } from '@/context/AuthContext'
import { BLOG_CATEGORIES, createPost, deletePost, getPostById, slugify, updatePost, type BlogPostInput } from '@/lib/blog'
import { ArrowLeft, Loader2, Save, Trash2, AlertCircle } from 'lucide-react'
import type { BlogCategory, BlogPostStatus } from '@/types'

const EMPTY_FORM: BlogPostInput = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: 'FreshlyForward Updates',
  cover_image_url: null,
  read_time_minutes: 5,
  status: 'draft',
  author_name: '',
  published_at: null,
}

export function BlogPostEditorPage() {
  const { postId } = useParams<{ postId: string }>()
  const isNew = !postId || postId === 'new'
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [form, setForm] = useState<BlogPostInput>(EMPTY_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !postId) return
    getPostById(postId).then((post) => {
      if (post) {
        const { id: _id, created_at: _c, updated_at: _u, ...rest } = post
        setForm(rest)
        setSlugTouched(true)
      } else {
        setError('Post not found.')
      }
      setLoading(false)
    })
  }, [isNew, postId])

  const update = <K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleTitleChange = (title: string) => {
    update('title', title)
    if (!slugTouched) {
      update('slug', slugify(title))
    }
  }

  const handleSave = async () => {
    setError(null)

    if (!form.title.trim()) return setError('Title is required.')
    if (!form.slug.trim()) return setError('Slug is required.')
    if (form.status !== 'draft' && !form.published_at) {
      // Default to now if publishing/scheduling without an explicit date.
      update('published_at', new Date().toISOString())
    }

    setSaving(true)
    const payload: BlogPostInput = {
      ...form,
      published_at: form.status === 'draft' ? form.published_at : form.published_at || new Date().toISOString(),
      author_name: form.author_name || profile?.full_name || 'FreshlyForward Team',
    }

    if (isNew) {
      if (!user) {
        setSaving(false)
        return setError('You must be signed in.')
      }
      const { error: createError, id } = await createPost(payload, user.id)
      setSaving(false)
      if (createError) return setError(createError)
      navigate(`/strategist/blog-posts/${id}`)
    } else if (postId) {
      const { error: updateError } = await updatePost(postId, payload)
      setSaving(false)
      if (updateError) return setError(updateError)
      navigate('/strategist/blog-posts')
    }
  }

  const handleDelete = async () => {
    if (!postId || isNew) return
    if (!window.confirm(`Delete "${form.title}"? This can't be undone.`)) return
    setDeleting(true)
    const { error: deleteError } = await deletePost(postId)
    setDeleting(false)
    if (deleteError) return setError(deleteError)
    navigate('/strategist/blog-posts')
  }

  if (loading) {
    return (
      <StrategistLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </StrategistLayout>
    )
  }

  const inputClass =
    'mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

  return (
    <StrategistLayout>
      <button
        onClick={() => navigate('/strategist/blog-posts')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog Posts
      </button>

      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">
          {isNew ? 'New Post' : 'Edit Post'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {isNew ? 'Write a new article for The Forward Feed.' : 'Update this article.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-error-50 border border-error-100 px-4 py-3 text-sm text-error-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="5 Ways to Make Your Resume Stand Out"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Slug (URL)</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => { setSlugTouched(true); update('slug', slugify(e.target.value)) }}
            placeholder="5-ways-to-make-your-resume-stand-out"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-neutral-500">freshlyforward.com/forward-feed/{form.slug || '...'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => update('excerpt', e.target.value)}
            rows={2}
            placeholder="A one-sentence teaser shown on the homepage widget and listing page."
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Content</label>
          <textarea
            value={form.content}
            onChange={(e) => update('content', e.target.value)}
            rows={14}
            placeholder="Write the full article. Separate paragraphs with a blank line."
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value as BlogCategory)}
              className={inputClass}
            >
              {BLOG_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Read Time (minutes)</label>
            <input
              type="number"
              min={1}
              value={form.read_time_minutes}
              onChange={(e) => update('read_time_minutes', Number(e.target.value) || 1)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Author Name</label>
            <input
              type="text"
              value={form.author_name}
              onChange={(e) => update('author_name', e.target.value)}
              placeholder={profile?.full_name || 'FreshlyForward Team'}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Cover Image URL (optional)</label>
            <input
              type="text"
              value={form.cover_image_url || ''}
              onChange={(e) => update('cover_image_url', e.target.value || null)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value as BlogPostStatus)}
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>

          {form.status !== 'draft' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                {form.status === 'scheduled' ? 'Publish Date & Time' : 'Published At'}
              </label>
              <input
                type="datetime-local"
                value={form.published_at ? form.published_at.slice(0, 16) : ''}
                onChange={(e) => update('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {!isNew ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg border border-error-200 px-4 py-2.5 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Post
          </button>
        ) : <span />}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : isNew ? 'Create Post' : 'Save Changes'}
        </button>
      </div>
    </StrategistLayout>
  )
}
