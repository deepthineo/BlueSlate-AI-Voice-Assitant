import { Router } from 'express';
import Groq from 'groq-sdk';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { getActiveKnowledgeBase, buildKnowledgeContextString } from '../services/knowledge.service';

const router = Router();
const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ── List public franchise locations ─────────────────────────────
router.get('/franchises', async (_req, res) => {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, phone_number, ai_config')
    .order('name', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load franchises' });
    return;
  }

  const franchises = (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone_number,
    agentName: (l.ai_config as any)?.agent_name ?? 'Alex',
  }));

  res.json({ franchises });
});

// ── Chat with a franchise AI — customer asks questions ──────────
router.post('/chat', async (req, res) => {
  const { locationId, message, history } = req.body as {
    locationId?: string;
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!locationId || !message || message.length > 500) {
    res.status(400).json({ error: 'locationId and message required' });
    return;
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id, name, ai_config')
    .eq('id', locationId)
    .single();

  if (!location) {
    res.status(404).json({ error: 'Franchise not found' });
    return;
  }

  const kb = await getActiveKnowledgeBase(locationId);
  const knowledgeContext = kb
    ? buildKnowledgeContextString(kb)
    : `Business: ${location.name}. Knowledge base not yet loaded — encourage the customer to call for details.`;

  const agentName = (location.ai_config as any)?.agent_name ?? 'Alex';

  const systemPrompt = `You are ${agentName}, the AI assistant for ${location.name}.
A customer is asking you questions through the customer portal on the website.

${knowledgeContext}

RULES:
- Answer questions accurately using the knowledge above only
- Be warm, friendly, and helpful
- If information isn't in the knowledge base: "Great question — I'd recommend calling us or we can have someone reach out to you directly."
- Never invent services, prices, or hours not listed above
- Keep responses concise — 2-4 sentences max
- End each response by inviting a follow-up question or offering to have the team contact them`;

  const safeHistory = (history ?? []).slice(-10).filter(
    (h) => h.role === 'user' || h.role === 'assistant'
  );

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...safeHistory,
        { role: 'user', content: message },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const reply = completion.choices[0].message.content?.trim()
      ?? "I'd love to help! Please call us or I can have someone reach out to you.";

    res.json({ reply, agentName });
  } catch (err) {
    console.error('[Customer Chat] Error:', err);
    res.status(500).json({ error: 'AI temporarily unavailable' });
  }
});

// ── Look up customer inquiry by email AND phone (callers rarely give email) ──
router.get('/inquiry', async (req, res) => {
  const email = (req.query.email as string | undefined)?.trim().toLowerCase();
  const phone = (req.query.phone as string | undefined)?.trim();

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'valid email required' });
    return;
  }

  // Try email first; also search by phone variants derived from the email account
  const phoneDigits = phone ? phone.replace(/\D/g, '') : null;
  const phoneVariants = phoneDigits
    ? Array.from(new Set([phone!, phoneDigits, `+1${phoneDigits}`, `+${phoneDigits}`]))
    : [];

  // Look up by email, then fallback to phone if provided
  let { data, error } = await supabase
    .from('leads')
    .select('id, name, core_interest, call_outcome, status, score, notes, created_at, location_id')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(5);

  // If email found nothing and phone provided, try phone
  if ((!data || data.length === 0) && phoneVariants.length > 0) {
    const phoneResult = await supabase
      .from('leads')
      .select('id, name, core_interest, call_outcome, status, score, notes, created_at, location_id')
      .in('phone', phoneVariants)
      .order('created_at', { ascending: false })
      .limit(5);
    data = phoneResult.data;
    error = phoneResult.error;
  }

  if (error) {
    res.status(500).json({ error: 'lookup failed' });
    return;
  }

  if (!data || data.length === 0) {
    res.json({ found: false });
    return;
  }

  const locationIds = [...new Set(data.map((d) => d.location_id).filter(Boolean))];
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .in('id', locationIds);

  const locationMap = Object.fromEntries((locations ?? []).map((l) => [l.id, l.name]));

  res.json({
    found: true,
    inquiries: data.map((d) => ({
      id: d.id,
      franchise: locationMap[d.location_id] ?? 'A franchise',
      interest: d.core_interest,
      outcome: d.call_outcome,
      status: d.status,
      score: d.score,
      notes: d.notes,
      date: d.created_at,
    })),
  });
});

export default router;
