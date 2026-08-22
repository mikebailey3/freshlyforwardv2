/**
 * Indeed scraper — EDUCATIONAL / BEST-EFFORT ONLY.
 *
 *   Indeed's Terms of Service prohibit automated scraping. They actively
 * defend against it with Cloudflare challenges, rate limiting, and IP
 * bans, and have pursued legal action against repeat/commercial scrapers.
 * This script does NOT attempt to evade any of that (no CAPTCHA solving,
 * no proxy rotation, no fingerprint spoofing) -- it's a plain HTTP GET +
 * HTML parse that will simply stop working the moment Indeed blocks it
 * or changes their markup. Use at your own risk and judgment.
 *
 * Usage:
 *   npm run scrape:indeed -- --query "customer service" --location "Dallas, TX" --pages 2
 *
 * Requires env vars (service role key needed to write past RLS):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface ScrapedJobInput {
  external_id: string
  title: string
  company: string
  location: string | null
  description: string
  salary_text: string | null
  posting_url: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string) => {
    const idx = args.indexOf(flag)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }
  return {
    query: get('--query', 'customer service'),
    location: get('--location', ''),
    pages: parseInt(get('--pages', '1'), 10),
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchSearchPage(query: string, location: string, start: number): Promise<string> {
  const url = new URL('https://www.indeed.com/jobs')
  url.searchParams.set('q', query)
  if (location) url.searchParams.set('l', location)
  if (start > 0) url.searchParams.set('start', String(start))

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error(`Indeed responded with ${response.status} — likely blocked or rate-limited.`)
  }

  return response.text()
}

function looksBlocked(html: string): boolean {
  const lower = html.toLowerCase()
  return lower.includes('captcha') || lower.includes('unusual traffic') || lower.includes('additional verification required')
}

function parseJobCards(html: string, searchQuery: string): ScrapedJobInput[] {
  const $ = cheerio.load(html)
  const jobs: ScrapedJobInput[] = []

  $('.job_seen_beacon, .cardOutline, .jobsearch-ResultsList > li').each((_, el) => {
    const card = $(el)
    const titleEl = card.find('h2.jobTitle a, a.jcs-JobTitle')
    const title = titleEl.text().trim()
    if (!title) return

    const href = titleEl.attr('href') || ''
    const jobKeyMatch = href.match(/jk=([a-zA-Z0-9]+)/)
    const externalId = jobKeyMatch ? jobKeyMatch[1] : href

    const company = card.find('[data-testid="company-name"]').text().trim()
    const location = card.find('[data-testid="text-location"]').text().trim() || null
    const salary = card.find('[data-testid="attribute_snippet_testid"]').first().text().trim() || null
    const description = card.find('.job-snippet, [data-testid="jobsnippet_footer"]').text().trim()
    const postingUrl = href.startsWith('http') ? href : `https://www.indeed.com${href}`

    jobs.push({
      external_id: externalId || postingUrl,
      title,
      company,
      location,
      description,
      salary_text: salary,
      posting_url: postingUrl,
    })
  })

  return jobs.map((job) => ({ ...job, search_query: searchQuery } as ScrapedJobInput & { search_query: string }))
}

async function upsertJobs(jobs: (ScrapedJobInput & { search_query?: string })[]): Promise<void> {
  if (jobs.length === 0) return

  const rows = jobs.map((job) => ({
    source: 'indeed',
    external_id: job.external_id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    salary_text: job.salary_text,
    posting_url: job.posting_url,
    search_query: job.search_query ?? null,
    is_active: true,
    scraped_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('scraped_jobs')
    .upsert(rows, { onConflict: 'source,external_id' })

  if (error) {
    console.error('Error upserting scraped jobs:', error)
  } else {
    console.log(`Upserted ${rows.length} job(s).`)
  }
}

async function main() {
  const { query, location, pages } = parseArgs()
  console.log(`Scraping Indeed for "${query}" in "${location || 'anywhere'}" (${pages} page(s))...`)

  let totalFound = 0

  for (let page = 0; page < pages; page++) {
    const start = page * 10
    try {
      const html = await fetchSearchPage(query, location, start)

      if (looksBlocked(html)) {
        console.warn('Indeed appears to have served a CAPTCHA/block page. Stopping — this is expected behavior per their anti-scraping measures.')
        break
      }

      const jobs = parseJobCards(html, query)
      totalFound += jobs.length
      await upsertJobs(jobs)

      if (jobs.length === 0) {
        console.log('No more results found, stopping early.')
        break
      }
    } catch (err) {
      console.error(`Failed on page ${page}:`, err)
      break
    }

    await sleep(2000 + Math.random() * 2000) // basic politeness delay between pages
  }

  console.log(`Done. Found ${totalFound} job(s) across requested pages.`)
}

main().catch((err) => {
  console.error('Fatal error running scraper:', err)
  process.exit(1)
})
