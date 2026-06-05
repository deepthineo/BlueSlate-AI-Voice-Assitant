-- ============================================================
-- BLUESLATE — Multi-Tenant Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS (Franchisor level)
-- ============================================================
create table if not exists organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  clerk_org_id text unique,
  plan        text not null default 'trial',  -- trial | starter | pro | enterprise
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- LOCATIONS (Franchisee / individual location)
-- ============================================================
create table if not exists locations (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  phone_number text,                          -- Twilio number assigned to this location
  website_url  text,
  timezone     text not null default 'America/Chicago',
  address      text,
  ai_config    jsonb not null default '{
    "agent_name": "Alex",
    "personality": "friendly",
    "greeting": "Hi! Thanks for calling. How can I help you today?",
    "farewell": "Thanks for calling! We look forward to speaking with you soon.",
    "max_turns": 10
  }',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_locations_org_id on locations(org_id);

-- ============================================================
-- KNOWLEDGE BASES (Scraped website data per location)
-- ============================================================
create table if not exists knowledge_bases (
  id              uuid primary key default uuid_generate_v4(),
  location_id     uuid not null references locations(id) on delete cascade,
  org_id          uuid not null references organizations(id),
  source_url      text not null,
  raw_content     text,
  structured_data jsonb not null default '{}',
  -- structured_data shape: { title, description, services[], pricing[], hours, address, phone, faq[] }
  status          text not null default 'pending',  -- pending | processing | active | failed
  error_message   text,
  pages_scraped   int default 0,
  last_scraped_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_kb_location_id on knowledge_bases(location_id);
create index if not exists idx_kb_org_id on knowledge_bases(org_id);

-- ============================================================
-- KNOWLEDGE CHUNKS (for RAG / semantic search)
-- ============================================================
create table if not exists knowledge_chunks (
  id          uuid primary key default uuid_generate_v4(),
  kb_id       uuid not null references knowledge_bases(id) on delete cascade,
  location_id uuid not null,
  org_id      uuid not null,
  content     text not null,
  chunk_index int not null default 0,
  source_url  text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_chunks_kb_id on knowledge_chunks(kb_id);
create index if not exists idx_chunks_location_id on knowledge_chunks(location_id);

-- ============================================================
-- CALLS
-- ============================================================
create table if not exists calls (
  id              uuid primary key default uuid_generate_v4(),
  location_id     uuid not null references locations(id),
  org_id          uuid not null references organizations(id),
  twilio_call_sid text unique not null,
  from_number     text not null,
  to_number       text not null,
  direction       text not null default 'inbound',
  status          text not null default 'in_progress',  -- in_progress | completed | failed | no_answer
  duration_sec    int,
  transcript      text,                                 -- full conversation as text
  summary         text,                                 -- AI-generated 1-sentence summary
  sentiment_score float,                                -- -1 to 1
  recording_url   text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_calls_location_id on calls(location_id, started_at desc);
create index if not exists idx_calls_org_id on calls(org_id, started_at desc);
create index if not exists idx_calls_sid on calls(twilio_call_sid);

-- ============================================================
-- CALL TURNS (conversation state per turn for stateless server)
-- ============================================================
create table if not exists call_turns (
  id          uuid primary key default uuid_generate_v4(),
  call_id     uuid not null references calls(id) on delete cascade,
  location_id uuid not null,
  org_id      uuid not null,
  role        text not null,  -- user | assistant
  content     text not null,
  turn_index  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_turns_call_id on call_turns(call_id, turn_index asc);

-- ============================================================
-- LEADS (auto-extracted from call transcripts)
-- ============================================================
create table if not exists leads (
  id            uuid primary key default uuid_generate_v4(),
  location_id   uuid not null references locations(id),
  org_id        uuid not null references organizations(id),
  call_id       uuid references calls(id),
  name          text,
  phone         text,
  email         text,
  core_interest text,
  call_outcome  text,  -- qualified | booked | info_requested | callback_needed | not_interested | unknown
  status        text not null default 'new',  -- new | contacted | qualified | booked | converted | dead
  score         int not null default 0,       -- 0-100
  score_reason  text,
  notes         text,
  raw_extraction jsonb not null default '{}', -- full Gemini extraction JSON
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_leads_location_id on leads(location_id, created_at desc);
create index if not exists idx_leads_org_id on leads(org_id, created_at desc);
create index if not exists idx_leads_status on leads(location_id, status);
create index if not exists idx_leads_phone on leads(phone);

-- ============================================================
-- ROW LEVEL SECURITY
-- All queries go through the server using service_role key.
-- RLS here is a second-layer defense.
-- ============================================================
alter table organizations   enable row level security;
alter table locations        enable row level security;
alter table knowledge_bases  enable row level security;
alter table knowledge_chunks enable row level security;
alter table calls            enable row level security;
alter table call_turns       enable row level security;
alter table leads            enable row level security;

-- Service role bypasses RLS (used by our server)
-- For client-side direct queries (future), add policies here

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_organizations
  before update on organizations
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_locations
  before update on locations
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_knowledge_bases
  before update on knowledge_bases
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_leads
  before update on leads
  for each row execute function trigger_set_updated_at();

-- ============================================================
-- SEED: XP League Frisco demo tenant
-- ============================================================
insert into organizations (id, name, clerk_org_id, plan)
values (
  'a0000000-0000-0000-0000-000000000001',
  'XP League',
  'org_demo_xpleague',
  'trial'
) on conflict do nothing;

insert into locations (id, org_id, name, website_url, timezone, ai_config)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'XP League Frisco',
  'https://xpleague.com/frisco',
  'America/Chicago',
  '{
    "agent_name": "Alex",
    "personality": "friendly",
    "greeting": "Hi! Thanks for calling XP League Frisco, the premier youth esports training program! I am Alex, your virtual assistant. How can I help you today?",
    "farewell": "Thanks so much for calling XP League Frisco! We look forward to seeing you on the battlefield. Have a great day!",
    "max_turns": 10
  }'
) on conflict do nothing;
