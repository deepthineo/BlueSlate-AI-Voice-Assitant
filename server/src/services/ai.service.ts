import Groq from 'groq-sdk';
import { env } from '../config/env';
import type { LeadExtraction, KnowledgeStructuredData } from '../types';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// 70B model used for ALL tasks — accurate enough for context retrieval, still free on Groq
const SMART_MODEL = 'llama-3.3-70b-versatile';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

function convertHistory(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
): Msg[] {
  return history.map((h) => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.parts.map((p) => p.text).join(''),
  }));
}

// ============================================================
// CONVERSATION — Generate AI response for voice agent
// ============================================================
export async function generateVoiceResponse(params: {
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  systemPrompt: string;
  knowledgeContext: string;
  /** Identity the AI must never get wrong — e.g. the business + agent name. */
  businessName: string;
  /**
   * True when there is no usable knowledge base for this location.
   * In this mode the AI is honest about being newly set up instead of
   * inventing services/prices/topics (the cause of "PUBG / restaurant" answers).
   */
  kbIsEmpty?: boolean;
}): Promise<string> {
  const { userMessage, conversationHistory, systemPrompt, knowledgeContext, businessName, kbIsEmpty } = params;

  // Behaviour rules that apply in BOTH modes — these are the anti-hallucination
  // and anti-fake-transfer guardrails that fix the demo feedback.
  const groundingRules = `
═══════════════════════════════════════════════════════════════
WHO YOU ARE — NEVER CONTRADICT THIS
You are the AI receptionist for "${businessName}". You ONLY ever talk about
"${businessName}" and what it offers. You are NOT a general assistant.
═══════════════════════════════════════════════════════════════

HARD RULES (these override everything else):
1. You ONLY discuss "${businessName}" and the information in the knowledge base below.
   You have NO knowledge of any other business, topic, game, restaurant, or product.
2. NEVER invent, assume, or guess services, prices, programs, hours, or facts.
   If it is not written in the knowledge base, you do NOT know it.
3. NEVER claim to do something you cannot do. You CANNOT transfer calls, connect
   the caller to a person, look things up live, or take payment. Do NOT say
   "let me transfer you" or "connecting you now" — instead, offer to take their
   details so the team follows up.
4. If the caller asks something unrelated to "${businessName}" (sports, games,
   restaurants, general trivia, other companies), politely redirect:
   "I'm ${businessName}'s assistant, so I can only help with questions about us —
   what would you like to know about what we offer?"
5. When the caller asks "what can you help with?" or "what is this?", answer
   ONLY with what is actually in the knowledge base for "${businessName}" — list
   real programs/services from below. If the knowledge base is empty, say so honestly.`;

  const answeringInEmptyMode = `
KNOWLEDGE BASE STATUS: NOT YET CONFIGURED.
You do not have this business's details loaded yet. Be honest and helpful — do NOT
make anything up. For ANY factual question (services, pricing, hours, programs):
  "I'm ${businessName}'s assistant and I'm still being set up with our full details —
   I don't want to give you wrong info. Can I grab your name and number so our team
   can reach out with the exact answer?"
Stay warm, never invent details, and focus on capturing their name and number.`;

  const answeringWithKb = `
════════════════════════════════════════════════════
KNOWLEDGE BASE — YOUR ONLY SOURCE OF TRUTH for "${businessName}"
Answer ALL factual questions by reading this first:
════════════════════════════════════════════════════
${knowledgeContext}
════════════════════════════════════════════════════

HOW TO ANSWER QUESTIONS:
- Services, pricing, programs, hours, location, age groups → find the answer above
  and state it DIRECTLY and ACCURATELY. Do not paraphrase or guess.
- If the exact answer IS above → give it clearly and correctly.
- If the answer is NOT above → say: "Great question — I want to make sure you get
  the right details, so let me have our team follow up. Can I grab your name and number?"
- NEVER say something is available unless you can see it listed above.`;

  const fullSystemPrompt = `${systemPrompt}
${groundingRules}
${kbIsEmpty ? answeringInEmptyMode : answeringWithKb}

VOICE STYLE:
- Keep responses to 1-3 sentences — this is a phone call, be concise but complete
- Sound warm and natural, use contractions: "I'm", "we've", "that's", "you'll"
- After answering, ask ONE brief follow-up question to continue the conversation
- Goal: understand their need, then guide toward booking a free trial or getting their contact info`;

  const messages: Msg[] = [
    { role: 'system', content: fullSystemPrompt },
    ...convertHistory(conversationHistory),
    { role: 'user', content: userMessage },
  ];

  const completion = await groq.chat.completions.create({
    model: SMART_MODEL,
    messages,
    max_tokens: 200,
    // Lower temperature → less free-association / hallucination on a grounded task.
    temperature: 0.15,
  });

  return completion.choices[0].message.content?.trim()
    ?? `I want to make sure I get you the right info about ${businessName} — can I grab your name and number so our team can follow up?`;
}

// ============================================================
// LEAD EXTRACTION — Parse lead data from transcript
// ============================================================
export async function extractLeadFromTranscript(params: {
  transcript: string;
  fromPhone: string;
}): Promise<LeadExtraction> {
  const { transcript, fromPhone } = params;

  const prompt = `You are extracting structured lead data from a phone call transcript for a franchise business.

TRANSCRIPT:
${transcript}

CALLER'S PHONE NUMBER: ${fromPhone}

Extract the following information and return ONLY valid JSON (no markdown, no explanation):
{
  "caller_name": "string or null",
  "phone": "${fromPhone}",
  "email": "string or null",
  "core_interest": "what service/program they are most interested in",
  "call_outcome": "one of: qualified | booked | info_requested | callback_needed | not_interested | unknown",
  "timeline": "when they want to start: immediate | this_week | this_month | future | unknown",
  "age_of_child": "if applicable for youth programs",
  "specific_questions": ["array of specific questions they asked"],
  "objections": ["any objections or concerns raised"],
  "next_action": "what should happen next to move this lead forward",
  "summary": "one sentence summary of the call",
  "extraction_confidence": 0.95
}

If information is not in the transcript, use null. Return ONLY the JSON object.`;

  const completion = await groq.chat.completions.create({
    model: SMART_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.1,
  });

  const text = completion.choices[0].message.content?.trim() ?? '';
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(jsonText) as LeadExtraction;
  } catch {
    return {
      caller_name: null,
      phone: fromPhone,
      email: null,
      core_interest: null,
      call_outcome: 'unknown',
      timeline: null,
      summary: 'Extraction failed — review transcript manually',
      extraction_confidence: 0,
    };
  }
}

// ============================================================
// KNOWLEDGE EXTRACTION — Structure scraped website content
// ============================================================
export async function structureWebsiteContent(rawContent: string, sourceUrl: string): Promise<KnowledgeStructuredData> {
  const prompt = `You are extracting structured business information from a franchise website's scraped content.

SOURCE URL: ${sourceUrl}

SCRAPED CONTENT:
${rawContent.substring(0, 12000)}

Extract all relevant business information and return ONLY valid JSON (no markdown):
{
  "title": "business name",
  "description": "1-2 sentence business description",
  "location_summary": "what this specific location offers",
  "services": [{"name": "service name", "description": "what it is", "price": "if mentioned"}],
  "pricing": [{"tier": "plan name", "price": "$X/month or session", "features": ["feature 1"]}],
  "programs": ["program 1", "program 2"],
  "age_groups": ["ages 8-12", "teens"],
  "hours": "business hours if mentioned",
  "address": "physical address if found",
  "phone": "phone number if found",
  "email": "email if found",
  "faq": [{"question": "common question", "answer": "answer from content"}],
  "key_selling_points": ["unique value prop 1", "unique value prop 2"]
}

If information is not found in the content, omit the field or use null. Return ONLY the JSON.`;

  const completion = await groq.chat.completions.create({
    model: SMART_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
    temperature: 0.1,
  });

  const text = completion.choices[0].message.content?.trim() ?? '';
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    return JSON.parse(jsonText) as KnowledgeStructuredData;
  } catch {
    return {
      title: sourceUrl,
      description: 'Content extraction failed — please add knowledge manually',
      key_selling_points: [],
    };
  }
}

// ============================================================
// CALL SUMMARY — Generate 1-sentence call summary
// ============================================================
export async function summarizeCall(transcript: string): Promise<{ summary: string; sentimentScore: number }> {
  const prompt = `Analyze this phone call transcript and return ONLY valid JSON:
{
  "summary": "one sentence describing what happened in this call and its outcome",
  "sentiment_score": 0.7
}

sentiment_score is from -1 (very negative) to 1 (very positive), 0 is neutral.

TRANSCRIPT:
${transcript}

Return ONLY the JSON object.`;

  const completion = await groq.chat.completions.create({
    model: SMART_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.1,
  });

  const text = completion.choices[0].message.content?.trim() ?? '';
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try {
    const data = JSON.parse(jsonText);
    return {
      summary: data.summary ?? 'Call completed',
      sentimentScore: typeof data.sentiment_score === 'number' ? data.sentiment_score : 0,
    };
  } catch {
    return { summary: 'Call completed', sentimentScore: 0 };
  }
}
