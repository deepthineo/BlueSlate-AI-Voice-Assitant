import { Router } from 'express';
import axios from 'axios';
import Groq from 'groq-sdk';
import { env } from '../config/env';
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
