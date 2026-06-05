export interface FranchiseLocation {
  id: string;
  org_id: string;
  name: string;
  phone_number: string | null;
  website_url: string | null;
  timezone: string;
  address: string | null;
  ai_config: {
    agent_name: string;
    greeting: string;
    farewell: string;
    max_turns: number;
    personality: string;
  };
}

/** @deprecated Use FranchiseLocation */
export type Location = FranchiseLocation;

export interface KnowledgeBase {
  id: string;
  location_id: string;
  source_url: string;
  status: 'pending' | 'processing' | 'active' | 'failed';
  pages_scraped: number;
  last_scraped_at: string | null;
  structured_data: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export interface Call {
  id: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: 'in_progress' | 'completed' | 'failed' | 'no_answer';
  duration_sec: number | null;
  transcript: string | null;
  summary: string | null;
  sentiment_score: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface Lead {
  id: string;
  call_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  core_interest: string | null;
  call_outcome: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'booked' | 'converted' | 'dead';
  score: number;
  score_reason: string | null;
  notes: string | null;
  raw_extraction: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  calls?: Call;
}

export interface LeadStats {
  total: number;
  new: number;
  qualified: number;
  booked: number;
  converted: number;
  hot: number;
  last7Days: number;
  avgScore: number;
  outcomeBreakdown: Record<string, number>;
}

export interface CallStats {
  total: number;
  completed: number;
  failed: number;
  noAnswer: number;
  avgDurationSec: number;
  avgSentiment: number;
}
