import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublishedPosts, BLOG_CATEGORIES } from '@/lib/blog'
import type { BlogCategory, BlogPost } from '@/types'

function readTimeLabel(minutes: number): string {
  return `${minutes} min read`
}

function formatPostDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ForwardFeedPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null)

  useEffect(() => {
    setLoading(true)
    getPublishedPosts(activeCategory)
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [activeCategory])

  return (
    <main>
      <section className="page-hero page-hero-centered shell">
        <div>
          <p className="eyebrow">The Forward Feed</p>
          <h1>Career insights, straight from your search team.</h1>
          <p>Job search strategy, interview preparation, and platform updates — written by the humans behind FreshlyForward.</p>
        </div>
      </section>

      <section className="interior-section shell">
        <div className="blog-listing-filters" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`blog-filter-pill${activeCategory === null ? ' active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            All Posts
          </button>
          {BLOG_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`blog-filter-pill${activeCategory === category ? ' active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#8894a2' }}>Loading posts&hellip;</p>
        ) : posts.length === 0 ? (
          <div className="forward-feed-empty">
            {activeCategory
              ? `No posts in "${activeCategory}" yet — check back soon.`
              : 'No posts published yet — check back soon.'}
          </div>
        ) : (
          <div className="blog-listing-grid">
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
    </main>
  )
}
