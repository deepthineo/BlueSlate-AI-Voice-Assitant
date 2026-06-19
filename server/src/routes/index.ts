import { Router } from 'express';
import axios from 'axios';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { scrapeWebsite } from '../services/scraper.service';
import { analyzeBusinessWebsite } from '../services/gemini.service';
import voiceRoutes from './voice.routes';
import knowledgeRoutes from './knowledge.routes';
import leadsRoutes from './leads.routes';
import callsRoutes from './calls.routes';
import locationsRoutes from './locations.routes';
import adminRoutes from './admin.routes';
import portalRoutes from './portal.routes';
import customerRoutes from './customer.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'blueslate-api' });
});

// DB diagnostic — no auth required, safe to call from browser
router.get('/health/db', async (_req, res) => {
  const { supabase } = await import('../config/supabase');
  const { data, error } = await supabase.from('locations').select('id, name').limit(1);
  if (error) {
    console.error('[DB Health] Supabase error:', error);
    res.status(500).json({ ok: false, error: error.message, hint: error.hint, code: error.code });
    return;
  }
  res.json({ ok: true, rowCount: data?.length ?? 0, sample: data });
});

// ── Demo AI Chat — no auth, Groq LLM with BlueSlate product knowledge ──
const groqDemo = new Groq({ apiKey: env.GROQ_API_KEY });

const DEMO_SYSTEM_PROMPT = `You are Alex, an AI receptionist giving a live demo of the BlueSlate platform on its website.

BLUESLATE PRODUCT KNOWLEDGE:
- Product: BlueSlate AI — an AI voice receptionist platform built for franchise businesses
- Company/Owner: NeoAistriq (technology company that built BlueSlate for Fractal KX franchise operators)
- Launched: 2026
- What it does: Answers every inbound franchise call 24/7, captures leads automatically, makes outbound follow-up calls — so owners never miss a lead
- Features: 24/7 AI voice receptionist, automatic lead capture (name/phone/email/intent), lead scoring 0-100, knowledge base builder (paste URL → AI learns your business in 30 sec), outbound AI calling, real-time dashboard, multi-location support, custom AI name & personality
- Pricing: 100% free during early access. No credit card. No trial limits.
- Setup: Under 10 minutes. No developers needed. Sign up → paste franchise URL → get a phone number → done.
- Best for: Franchise businesses and multi-location owners who want to capture every inbound call as a lead.
- Contact: support@blueslate.ai

YOUR ROLE:
You ARE Alex — the AI receptionist product itself, demonstrating its capabilities live.
Answer questions accurately using the knowledge above.
Keep responses to 2-3 sentences — this is a voice demo, be concise.
After answering, naturally guide the visitor toward signing up.
If asked something not in the knowledge above, say the team will follow up.
NEVER make up details not listed above.`;

router.post('/demo/chat', async (req, res) => {
  const { message, history } = req.body as {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!message || typeof message !== 'string' || message.length > 400) {
    res.status(400).json({ error: 'message required, max 400 chars' });
    return;
  }

  try {
    const safeHistory = (history ?? [])
      .slice(-8)
      .filter((h) => h.role === 'user' || h.role === 'assistant');

    const completion = await groqDemo.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: DEMO_SYSTEM_PROMPT },
        ...safeHistory,
        { role: 'user', content: message },
      ],
      max_tokens: 120,
      temperature: 0.4,
    });

    const reply = completion.choices[0].message.content?.trim()
      ?? "Great question! The team will reach out with more details. Want me to pass along your contact info?";

    res.json({ reply });
  } catch (err) {
    console.error('[Demo Chat] Groq error:', err);
    res.status(500).json({ error: 'AI temporarily unavailable' });
  }
});

// ── Demo: visitor requests a callback (no auth, no signup) ────────
// First-time free visitors leave their number from the landing demo.
// Saved as a lead against the demo location so the team can call back
// (real outbound dialing requires an upgraded Twilio number).
const DEMO_LOCATION_ID = 'b0000000-0000-0000-0000-000000000001';

const callbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a few minutes.' },
});

router.post('/demo/callback-request', callbackLimiter, async (req, res) => {
  const { phone, name } = req.body as { phone?: string; name?: string };

  // Light validation — must look like a phone number
  const cleaned = (phone ?? '').replace(/[^\d+]/g, '');
  if (cleaned.length < 8 || cleaned.length > 16) {
    res.status(400).json({ error: 'A valid phone number is required.' });
    return;
  }

  try {
    const { supabase } = await import('../config/supabase');
    const { data: loc } = await supabase
      .from('locations')
      .select('id, org_id')
      .eq('id', DEMO_LOCATION_ID)
      .single();

    if (!loc) {
      res.status(503).json({ error: 'Demo not configured. Please try again later.' });
      return;
    }

    await supabase.from('leads').insert({
      location_id: loc.id,
      org_id: loc.org_id,
      name: (name ?? '').trim() || null,
      phone: cleaned,
      core_interest: 'Requested an AI callback from the landing demo',
      call_outcome: 'callback_requested',
      status: 'new',
      score: 50,
      score_reason: 'Self-submitted callback request (landing demo)',
    });

    res.json({ success: true, message: "Thanks! Alex will call you back shortly." });
  } catch (err) {
    console.error('[Demo Callback] error:', err);
    res.status(500).json({ error: 'Could not save your request. Please try again.' });
  }
});

// ── Try BlueSlate: public website scan (no auth) ──────────────────
// Visitor pastes their URL → we scrape → Gemini analyzes → instant preview.
// Rate-limited because it triggers an outbound fetch + LLM spend per call.
const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 8,                   // 8 scans per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scans — please wait a few minutes and try again.' },
});

function normalizeUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // Block obvious internal/loopback targets (SSRF guard)
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) return null;
    if (/^(10|192\.168|172\.(1[6-9]|2[0-9]|3[0-1]))\./.test(host)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

router.post('/demo/scan', scanLimiter, async (req, res) => {
  const { url } = req.body as { url?: string };
  const normalized = url ? normalizeUrl(url) : null;
  if (!normalized) {
    res.status(400).json({ error: 'A valid website URL is required (e.g. xpleaguefrisco.com).' });
    return;
  }

  try {
    const { rawContent, pagesScraped } = await scrapeWebsite(normalized);
    if (!rawContent || rawContent.length < 80) {
      res.status(422).json({ error: "We couldn't read enough from that site. Try the homepage URL or a different page." });
      return;
    }
    const scan = await analyzeBusinessWebsite({ rawContent, sourceUrl: normalized, pagesScraped });
    res.json(scan);
  } catch (err) {
    console.error('[Demo Scan] error:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: "We couldn't analyze that site right now. Please try again in a moment." });
  }
});

// ── Try BlueSlate: playground chat grounded in the scanned business ──
// Reuses Groq (fast) but injects the scanned knowledge_context as ground truth.
router.post('/demo/playground-chat', async (req, res) => {
  const { message, history, businessName, knowledgeContext } = req.body as {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    businessName?: string;
    knowledgeContext?: string;
  };

  if (!message || typeof message !== 'string' || message.length > 500) {
    res.status(400).json({ error: 'message required, max 500 chars' });
    return;
  }

  const name = (businessName || 'this business').slice(0, 120);
  const kb = (knowledgeContext || '').slice(0, 8000);

  const system = `You are the AI phone receptionist for "${name}", demonstrating BlueSlate live to the business owner.

KNOWLEDGE BASE — YOUR ONLY SOURCE OF TRUTH:
${kb || '(No knowledge base was captured. Be helpful but offer to take the caller\'s details for follow-up.)'}

RULES:
- Answer ONLY from the knowledge base above. If the answer isn't there, say you'll have the team follow up and offer to take their name and number.
- Keep replies to 1-3 sentences — this is a phone call. Warm, natural, use contractions.
- After answering, ask one brief follow-up to move toward booking or capturing contact info.
- Never invent prices or facts not in the knowledge base.`;

  try {
    const safeHistory = (history ?? [])
      .slice(-8)
      .filter((h) => h.role === 'user' || h.role === 'assistant');

    const completion = await groqDemo.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: system }, ...safeHistory, { role: 'user', content: message }],
      max_tokens: 160,
      temperature: 0.4,
    });

    const reply = completion.choices[0].message.content?.trim()
      ?? "Great question — let me have our team follow up with the details. Can I grab your name and number?";
    res.json({ reply });
  } catch (err) {
    console.error('[Playground Chat] Groq error:', err);
    res.status(500).json({ error: 'AI temporarily unavailable' });
  }
});

// ── Demo TTS — no auth, ElevenLabs human voice for landing page demo ──
// Rachel voice: warm, natural, professional female receptionist
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

router.post('/demo/tts', async (req, res) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string' || text.length > 400) {
    res.status(400).json({ error: 'text required, max 400 chars' });
    return;
  }

  if (!env.ELEVENLABS_API_KEY) {
    res.status(503).json({ error: 'TTS not configured' });
    return;
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true },
      },
      {
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 9000,
      }
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(response.data as ArrayBuffer));
  } catch (err: unknown) {
    const status = (err as any)?.response?.status ?? 502;
    console.error('[Demo TTS] ElevenLabs error:', status, (err as Error).message);
    res.status(502).json({ error: 'TTS generation failed' });
  }
});

// Public caller portal — no auth (phone-based lookup)
router.use('/portal', portalRoutes);

// Customer routes — public, no auth (franchise chat + inquiry lookup)
router.use('/customer', customerRoutes);

// Voice webhooks (no auth — Twilio signature validates)
router.use('/voice', voiceRoutes);

// Authenticated API routes
router.use('/locations', locationsRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/leads', leadsRoutes);
router.use('/calls', callsRoutes);
router.use('/admin', adminRoutes);

export default router;
