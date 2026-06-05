import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================================
// Primary: Jina AI Reader (free, renders JS, bypasses Cloudflare)
// Fallback: Direct HTTP scrape with cheerio
// ============================================================

export async function scrapeWebsite(startUrl: string): Promise<{
  rawContent: string;
  pagesScraped: number;
}> {
  // Try Jina AI Reader first — handles JS-rendered sites, free, no key needed
  try {
    const jinaContent = await scrapeWithJina(startUrl);
    if (jinaContent && jinaContent.length > 100) {
      console.log(`[Scraper] Jina succeeded for ${startUrl} (${jinaContent.length} chars)`);
      return { rawContent: jinaContent, pagesScraped: 1 };
    }
  } catch (err) {
    console.warn(`[Scraper] Jina failed: ${err instanceof Error ? err.message : err}`);
  }

  // Fallback: direct cheerio scrape
  console.log(`[Scraper] Falling back to direct scrape for ${startUrl}`);
  return scrapeWithCheerio(startUrl);
}

// ── Jina AI Reader ─────────────────────────────────────────
// GET https://r.jina.ai/{url} returns clean markdown of the page.
// Free tier, no API key, handles React/Next.js sites.
async function scrapeWithJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const response = await axios.get<string>(jinaUrl, {
    timeout: 25000,
    headers: {
      'Accept': 'text/plain, text/markdown',
      'X-Return-Format': 'text',
      'User-Agent': 'Mozilla/5.0 (compatible; Blueslate/1.0)',
    },
  });

  const text = response.data;
  if (typeof text !== 'string' || text.length < 100) {
    throw new Error('Jina returned insufficient content');
  }

  // Trim to 12k chars for Gemini prompt budget
  return `=== PAGE: ${url} ===\n${text.substring(0, 12000)}`;
}

// ── Direct cheerio scrape ──────────────────────────────────
async function scrapeWithCheerio(startUrl: string): Promise<{
  rawContent: string;
  pagesScraped: number;
}> {
  const pages: string[] = [];
  const visited = new Set<string>();
  const toVisit: string[] = [startUrl];
  const baseUrl = new URL(startUrl).origin;
  const basePath = new URL(startUrl).pathname;

  const MAX_PAGES = 6;
  const TIMEOUT_MS = 8000;

  while (toVisit.length > 0 && pages.length < MAX_PAGES) {
    const url = toVisit.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await axios.get<string>(url, {
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        maxRedirects: 5,
        decompress: true,
      });

      const contentType = String(response.headers['content-type'] ?? '');
      if (!contentType.includes('text/html')) continue;

      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, header, .cookie-banner, .popup, iframe').remove();

      const blocks: string[] = [];
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc) blocks.push(`Description: ${metaDesc}`);

      $('h1, h2, h3').each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > 3) blocks.push(`## ${t}`);
      });
      $('p, li, td').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t.length > 20) blocks.push(t);
      });

      const content = blocks.join('\n').substring(0, 4000);
      if (content.length > 50) {
        pages.push(`=== PAGE: ${url} ===\n${content}`);
      }

      const relevant = ['program', 'service', 'pricing', 'about', 'faq', 'schedule', 'enroll', 'contact'];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        try {
          const abs = new URL(href, baseUrl).href;
          const parsed = new URL(abs);
          if (
            parsed.origin === baseUrl &&
            !visited.has(abs) &&
            !abs.includes('#') &&
            !abs.match(/\.(pdf|jpg|png|gif|svg|css|js|zip)$/i) &&
            (abs.startsWith(baseUrl + basePath) || relevant.some((k) => abs.toLowerCase().includes(k)))
          ) {
            toVisit.push(abs);
          }
        } catch { /* ignore */ }
      });
    } catch (err) {
      console.warn(`[Scraper] Failed ${url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const rawContent = pages.join('\n\n');
  return { rawContent, pagesScraped: pages.length };
}

// ── Chunk content for RAG ──────────────────────────────────
export function chunkContent(rawContent: string, chunkSize = 500, overlap = 50): string[] {
  const words = rawContent.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 50) chunks.push(chunk.trim());
  }
  return chunks;
}
