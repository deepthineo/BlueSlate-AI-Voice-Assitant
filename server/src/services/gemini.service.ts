import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import type { BusinessScan } from '../types';

// ============================================================
// GEMINI ANALYSIS SERVICE
// Used for ASYNC analysis tasks (not latency-bound):
//   - public website business scan
//   - FAQ + sample-conversation generation
//   - customer personas, qualifying questions, knowledge-gap detection
// Real-time voice stays on Groq (see ai.service.ts) for sub-200ms latency.
// Degrades gracefully to a structured fallback when GEMINI_API_KEY is absent
// or the API fails — the landing page must never show a dead state.
// ============================================================

// 2.0 Flash: fast, large context, strong structured extraction, generous free tier.
const GEMINI_MODEL = 'gemini-2.0-flash';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

export function isGeminiEnabled(): boolean {
  return genAI !== null;
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

/**
 * Analyze scraped website content into a full BusinessScan for the public
 * "Try BlueSlate" experience. Never throws — returns a fallback scan on failure.
 */
export async function analyzeBusinessWebsite(params: {
  rawContent: string;
  sourceUrl: string;
  pagesScraped: number;
}): Promise<BusinessScan> {
  const { rawContent, sourceUrl, pagesScraped } = params;

  if (!genAI) {
    return fallbackScan(sourceUrl, pagesScraped, rawContent);
  }

  const prompt = `You are BlueSlate, an AI receptionist platform analyzing a business website so the owner can preview how an AI phone agent would represent their business.

SOURCE URL: ${sourceUrl}

SCRAPED WEBSITE CONTENT:
${rawContent.substring(0, 16000)}

Analyze the content and return ONLY valid JSON (no markdown, no commentary) with EXACTLY this shape:
{
  "business_name": "the business name",
  "summary": "2-3 sentence plain-English summary of what this business does and who it serves",
  "services": ["service or offering 1", "service 2"],
  "programs": ["specific program/package names if any"],
  "pricing_insights": ["human-readable pricing observations, e.g. 'Memberships appear to start around $X/month'"],
  "faqs": [{"question": "a question a real customer would call to ask", "answer": "concise answer grounded ONLY in the content"}],
  "customer_personas": ["short persona descriptions of who calls this business"],
  "qualifying_questions": ["questions the AI receptionist should ask to qualify a lead"],
  "knowledge_gaps": ["important questions a caller might ask that the website does NOT answer"],
  "sample_conversations": [
    {
      "scenario": "short scenario label",
      "direction": "inbound",
      "turns": [
        {"speaker": "caller", "text": "..."},
        {"speaker": "ai", "text": "..."}
      ]
    }
  ]
}

RULES:
- Generate 5-7 FAQs, 3-4 customer_personas, 4-6 qualifying_questions, 3-5 knowledge_gaps.
- Generate exactly 2 sample_conversations: one "inbound" (a customer calls in) and one "outbound" (the AI follows up on a lead). 4-6 turns each, warm and natural, grounded in the real business facts.
- NEVER invent specific prices or facts not present in the content. If pricing is unknown, say so in pricing_insights.
- Keep AI turns to 1-3 sentences (this is a phone call).
- Return ONLY the JSON object.`;

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.3, maxOutputTokens: 2400, responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = stripFences(result.response.text());
    const parsed = JSON.parse(text) as Partial<BusinessScan>;

    return {
      business_name: parsed.business_name || hostname(sourceUrl),
      summary: parsed.summary || 'We analyzed your site and prepared a preview of how your AI receptionist would handle calls.',
      services: arr(parsed.services),
      programs: arr(parsed.programs),
      pricing_insights: arr(parsed.pricing_insights),
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs.filter((f) => f && f.question) : [],
      customer_personas: arr(parsed.customer_personas),
      qualifying_questions: arr(parsed.qualifying_questions),
      knowledge_gaps: arr(parsed.knowledge_gaps),
      sample_conversations: Array.isArray(parsed.sample_conversations)
        ? parsed.sample_conversations.filter((c) => c && Array.isArray(c.turns))
        : [],
      knowledge_context: buildKnowledgeContext(parsed, rawContent),
      source_url: sourceUrl,
      pages_scraped: pagesScraped,
      model: 'gemini',
    };
  } catch (err) {
    console.error('[Gemini] analyzeBusinessWebsite failed:', err instanceof Error ? err.message : err);
    return fallbackScan(sourceUrl, pagesScraped, rawContent);
  }
}

// ── Helpers ────────────────────────────────────────────────
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim().length > 0) : [];
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Your Business'; }
}

function buildKnowledgeContext(parsed: Partial<BusinessScan>, rawContent: string): string {
  const parts: string[] = [];
  if (parsed.business_name) parts.push(`BUSINESS: ${parsed.business_name}`);
  if (parsed.summary) parts.push(`SUMMARY: ${parsed.summary}`);
  if (parsed.services?.length) parts.push(`SERVICES: ${parsed.services.join(', ')}`);
  if (parsed.programs?.length) parts.push(`PROGRAMS: ${parsed.programs.join(', ')}`);
  if (parsed.pricing_insights?.length) parts.push(`PRICING: ${parsed.pricing_insights.join(' | ')}`);
  if (parsed.faqs?.length) {
    parts.push('FAQ:\n' + parsed.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n'));
  }
  // Append a trimmed slice of raw content as a grounding backstop.
  parts.push(`\nRAW SITE EXCERPT:\n${rawContent.substring(0, 4000)}`);
  return parts.join('\n');
}

function fallbackScan(sourceUrl: string, pagesScraped: number, rawContent: string): BusinessScan {
  const name = hostname(sourceUrl);
  return {
    business_name: name,
    summary: `We scanned ${name} and pulled the key details your AI receptionist would use to answer calls. Connect Gemini for a richer breakdown, or sign up to build your full knowledge base.`,
    services: [],
    programs: [],
    pricing_insights: ['Pricing details were not detected automatically — your AI can be trained to share them.'],
    faqs: [
      { question: 'What are your hours?', answer: 'Your AI receptionist will answer this from your knowledge base once configured.' },
      { question: 'How do I get started?', answer: 'Your AI can capture the caller\'s details and route them to your team.' },
    ],
    customer_personas: ['New prospect calling for the first time', 'Existing customer with a question'],
    qualifying_questions: ['What service are you most interested in?', 'When are you looking to get started?', 'What\'s the best number to reach you?'],
    knowledge_gaps: ['Connect Gemini to detect what your website cannot answer.'],
    sample_conversations: [
      {
        scenario: 'Inbound — new caller',
        direction: 'inbound',
        turns: [
          { speaker: 'ai', text: `Hi, thanks for calling ${name}! I'm your AI receptionist. How can I help today?` },
          { speaker: 'caller', text: 'Hi, I wanted to learn more about what you offer.' },
          { speaker: 'ai', text: 'Happy to help! Can I grab your name and the best number to reach you so I can make sure our team follows up with the right details?' },
        ],
      },
    ],
    knowledge_context: `BUSINESS: ${name}\n\nRAW SITE EXCERPT:\n${rawContent.substring(0, 4000)}`,
    source_url: sourceUrl,
    pages_scraped: pagesScraped,
    model: 'fallback',
  };
}
