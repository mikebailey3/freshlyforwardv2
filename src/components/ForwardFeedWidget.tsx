import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getRecentPublishedPosts } from '@/lib/blog'
import { SectionHeading } from '@/components/ui'
import type { BlogPost } from '@/types'

function readTimeLabel(minutes: number): string {
  return `${minutes} min read`
}

function formatPostDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * "From The Forward Feed" homepage widget — the three most recent published
 * blog posts. Each card's left accent bar is color-coded by category, so
 * readers can scan the section by topic at a glance.
 */
export function ForwardFeedWidget() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentPublishedPosts(3)
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [])

  if (!loading && posts.length === 0) return null

  return (
    <section className="forward-feed shell" aria-labelledby="forward-feed-title">
      <div className="forward-feed-head">
        <SectionHeading eyebrow="From the blog" title="From The Forward Feed" id="forward-feed-title" />
        <Link to="/forward-feed" className="forward-feed-viewall">
          View All Posts <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="forward-feed-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="forward-feed-card" style={{ opacity: 0.5 }}>
              <span className="forward-feed-category">Loading&hellip;</span>
              <p className="forward-feed-title">&nbsp;</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="forward-feed-grid">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/forward-feed/${post.slug}`}
              className="forward-feed-card"
              data-category={post.category}
            >
              <span className="forward-feed-category">{post.category}</span>
              <h3 className="forward-feed-title">{post.title}</h3>
              <p className="forward-feed-excerpt">{post.excerpt}</p>
              <div className="forward-feed-meta">
                <span>{formatPostDate(post.published_at)}</span>
                <span>&middot;</span>
                <span>{readTimeLabel(post.read_time_minutes)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
