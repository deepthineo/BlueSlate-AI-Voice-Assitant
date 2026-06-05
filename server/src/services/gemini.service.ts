import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env';
import type { LeadExtraction, KnowledgeStructuredData } from '../types';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Models in preference order — first one that works will be used
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',       // Current free working model (confirmed)
  'gemini-1.5-flash',       // AI Studio classic free key
  'gemini-2.0-flash-lite',  // Fallback lite
  'gemini-2.0-flash',       // Fallback
];

let _resolvedModel: string | null = null;

async function resolveModel(): Promise<string> {
  if (_resolvedModel) return _resolvedModel;

  // Try each candidate with a minimal call
  for (const name of CANDIDATE_MODELS) {
    try {
      const m = genAI.getGenerativeModel({ model: name });
      await m.generateContent('hi');
      _resolvedModel = name;
      console.log(`[Gemini] Using model: ${name}`);
      return name;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('404') || (msg.includes('429') && msg.includes('limit: 0'))) {
        console.warn(`[Gemini] Model ${name} not available, trying next...`);
        continue;
      }
      // 429 rate limit (but model exists) — use this model
      _resolvedModel = name;
      console.log(`[Gemini] Using model: ${name} (rate limited, will retry)`);
      return name;
    }
  }

  throw new Error(
    'No working Gemini model found. Get a free API key at https://aistudio.google.com/apikey ' +
    'and update GEMINI_API_KEY in server/.env'
  );
}

function getModel(modelName?: string): GenerativeModel {
  return genAI.getGenerativeModel({ model: modelName ?? (_resolvedModel ?? 'gemini-1.5-flash') });
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

  const model = getModel();

  const fullSystemPrompt = `${systemPrompt}

KNOWLEDGE BASE (what you know about this business):
${knowledgeContext}

CRITICAL RULES:
- Keep responses SHORT — under 30 words unless detail is explicitly requested
- Speak naturally, like a real receptionist on the phone
- If asked about pricing/details not in your knowledge base, say: "Great question! Let me have our team follow up with you on that exact detail."
- Always try to get the caller's name early in the conversation
- At every natural opportunity, offer to book a trial session or schedule a callback
- NEVER make up information not in your knowledge base`;

  const modelName = await resolveModel();
  const modelWithSystem = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: fullSystemPrompt,
  });

  // Gemini requires history to start with 'user' — strip any leading 'model' turns
  const safeHistory = (() => {
    const idx = conversationHistory.findIndex(h => h.role === 'user');
    return idx === -1 ? [] : conversationHistory.slice(idx);
  })();

  const chat = modelWithSystem.startChat({
    history: safeHistory,
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text().trim();
}

// ============================================================
// LEAD EXTRACTION — Parse lead data from transcript
// ============================================================
export async function extractLeadFromTranscript(params: {
  transcript: string;
  fromPhone: string;
}): Promise<LeadExtraction> {
  const { transcript, fromPhone } = params;

  const model = getModel(await resolveModel());

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code blocks if present
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
  const model = getModel(await resolveModel());

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
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
  const model = getModel(await resolveModel());

  const prompt = `Analyze this phone call transcript and return ONLY valid JSON:
{
  "summary": "one sentence describing what happened in this call and its outcome",
  "sentiment_score": 0.7
}

sentiment_score is from -1 (very negative) to 1 (very positive), 0 is neutral.

TRANSCRIPT:
${transcript}

Return ONLY the JSON object.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
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
