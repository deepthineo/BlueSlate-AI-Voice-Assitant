// ============================================================
// BLUESLATE — Shared Types
// ============================================================

export interface TenantContext {
  orgId: string;
  locationId: string;
  userId: string;
  role: 'platform_admin' | 'org_admin' | 'location_manager' | 'location_staff';
}

export interface Organization {
  id: string;
  name: string;
  clerk_org_id: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  org_id: string;
  name: string;
  phone_number: string | null;
  website_url: string | null;
  timezone: string;
  address: string | null;
  ai_config: AIConfig;
  created_at: string;
  updated_at: string;
}

export interface AIConfig {
  agent_name: string;
  personality: 'friendly' | 'professional' | 'enthusiastic';
  greeting: string;
  farewell: string;
  max_turns: number;
}

export interface KnowledgeBase {
  id: string;
  location_id: string;
  org_id: string;
  source_url: string;
  raw_content: string | null;
  structured_data: KnowledgeStructuredData;
  status: 'pending' | 'processing' | 'active' | 'failed';
  error_message: string | null;
  pages_scraped: number;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeStructuredData {
  title?: string;
  description?: string;
  services?: Array<{ name: string; description: string; price?: string }>;
  pricing?: Array<{ tier: string; price: string; features: string[] }>;
  hours?: string;
  address?: string;
  phone?: string;
  email?: string;
  faq?: Array<{ question: string; answer: string }>;
  programs?: string[];
  age_groups?: string[];
  location_summary?: string;
  key_selling_points?: string[];
}

export interface Call {
  id: string;
  location_id: string;
  org_id: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  status: 'in_progress' | 'completed' | 'failed' | 'no_answer';
  duration_sec: number | null;
  transcript: string | null;
  summary: string | null;
  sentiment_score: number | null;
  recording_url: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface CallTurn {
  id: string;
  call_id: string;
  location_id: string;
  org_id: string;
  role: 'user' | 'assistant';
  content: string;
  turn_index: number;
  created_at: string;
}

export interface Lead {
  id: string;
  location_id: string;
  org_id: string;
  call_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  core_interest: string | null;
  call_outcome: 'qualified' | 'booked' | 'info_requested' | 'callback_needed' | 'not_interested' | 'unknown' | null;
  status: 'new' | 'contacted' | 'qualified' | 'booked' | 'converted' | 'dead';
  score: number;
  score_reason: string | null;
  notes: string | null;
  raw_extraction: LeadExtraction;
  created_at: string;
  updated_at: string;
}

export interface LeadExtraction {
  caller_name?: string | null;
  phone?: string | null;
  email?: string | null;
  core_interest?: string | null;
  call_outcome?: string;
  timeline?: string | null;
  age_of_child?: string | null;
  specific_questions?: string[];
  objections?: string[];
  next_action?: string;
  summary?: string;
  extraction_confidence?: number;
}

// Augment Express Request with tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}
