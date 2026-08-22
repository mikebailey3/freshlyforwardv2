import { supabase } from '@/lib/supabase'
import type { BlogCategory, BlogPost } from '@/types'

export const BLOG_CATEGORIES: BlogCategory[] = [
  'Job Search Tips',
  'Interview Prep',
  'Career Growth',
  'FreshlyForward Updates',
]

/**
 * Fetches the N most recently published posts, for widgets like the
 * homepage "Forward Feed" preview and the member dashboard card.
 */
export async function getRecentPublishedPosts(limit = 3): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent posts:', error)
    return []
  }
  return (data as BlogPost[]) || []
}

/**
 * Fetches all published posts, optionally filtered by category, for the
 * public Forward Feed listing page.
 */
export async function getPublishedPosts(category?: BlogCategory | null): Promise<BlogPost[]> {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return (data as BlogPost[]) || []
}

/** Fetches a single published post by slug, for the public post detail page. */
export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()

  if (error) {
    console.error('Error fetching post:', error)
    return null
  }
  return data as BlogPost | null
}

/** Fetches every post regardless of status, for staff (admin/strategist) management. */
export async function getAllPostsForStaff(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return (data as BlogPost[]) || []
}

/** Fetches a single post by id regardless of status, for the staff editor. */
export async function getPostById(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('Error fetching post:', error)
    return null
  }
  return data as BlogPost | null
}

export type BlogPostInput = Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'author_id'>

export async function createPost(input: BlogPostInput, authorId: string): Promise<{ error: string | null; id: string | null }> {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({ ...input, author_id: authorId })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }
  return { error: null, id: (data as { id: string }).id }
}

export async function updatePost(id: string, input: Partial<BlogPostInput>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('blog_posts').update(input).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deletePost(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  return { error: error?.message ?? null }
}

/** Turns a title into a URL-safe slug, e.g. for auto-filling the editor. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
