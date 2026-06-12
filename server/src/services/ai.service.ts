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
}): Promise<string> {
  const { userMessage, conversationHistory, systemPrompt, knowledgeContext } = params;

  const fullSystemPrompt = `${systemPrompt}

════════════════════════════════════════════════════
KNOWLEDGE BASE — YOUR ONLY SOURCE OF TRUTH
Answer ALL factual questions by reading this first:
════════════════════════════════════════════════════
${knowledgeContext}
════════════════════════════════════════════════════

HOW TO ANSWER QUESTIONS:
- For questions about services, pricing, programs, hours, location, age groups → find the answer above and state it DIRECTLY and ACCURATELY. Do not paraphrase or guess.
- If the exact answer IS in the knowledge base → give it clearly and correctly.
- If the answer is NOT in the knowledge base → say: "Great question — I want to make sure you get the right details, so let me have our team follow up. Can I grab your name and number?"
- NEVER invent or assume services, prices, or details that are not listed above.
- NEVER say something is available if you don't see it in the knowledge base.

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
    temperature: 0.3,
  });

  return completion.choices[0].message.content?.trim() ?? "Sure, let me help you with that!";
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
