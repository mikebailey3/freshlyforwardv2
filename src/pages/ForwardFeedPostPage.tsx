import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPublishedPostBySlug } from '@/lib/blog'
import type { BlogPost } from '@/types'

function formatPostDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function ForwardFeedPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPublishedPostBySlug(slug)
      .then(setPost)
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <main>
        <div className="blog-detail shell">
          <p style={{ color: '#8894a2' }}>Loading&hellip;</p>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main>
        <div className="blog-detail shell blog-detail-empty">
          <p className="eyebrow">The Forward Feed</p>
          <h1>We couldn&rsquo;t find that post.</h1>
          <p>It may have been moved or unpublished.</p>
          <Link to="/forward-feed" className="blog-detail-back">
            <ArrowLeft size={15} aria-hidden="true" /> Back to The Forward Feed
          </Link>
        </div>
      </main>
    )
  }

  const paragraphs = post.content.split(/\n\s*\n/).filter(Boolean)

  return (
    <main>
      <div className="blog-detail shell">
        <Link to="/forward-feed" className="blog-detail-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to The Forward Feed
        </Link>
        <p className="forward-feed-category" data-category={post.category}>{post.category}</p>
        <h1>{post.title}</h1>
        <div className="blog-detail-meta">
          <span>{post.author_name}</span>
          <span>{formatPostDate(post.published_at)}</span>
          <span>{post.read_time_minutes} min read</span>
        </div>
        <div className="blog-detail-body">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </main>
  )
}
