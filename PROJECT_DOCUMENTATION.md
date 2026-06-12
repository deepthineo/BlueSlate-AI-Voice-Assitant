# BlueSlate — Project Documentation

Complete reference for how the system was built, how it works, and how the UI flows.

---

## Table of Contents

1. [What Is BlueSlate](#1-what-is-blueslate)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Three Core Loops](#5-three-core-loops)
6. [Backend — How It Works](#6-backend--how-it-works)
7. [Frontend — How It Works](#7-frontend--how-it-works)
8. [UI Page-by-Page Guide](#8-ui-page-by-page-guide)
9. [User Flows](#9-user-flows)
10. [Data Models](#10-data-models)
11. [API Routes Reference](#11-api-routes-reference)
12. [Environment Variables](#12-environment-variables)

---

## 1. What Is BlueSlate

BlueSlate is an **AI-native receptionist platform for franchise businesses**. It:

- Answers every inbound phone call 24/7 using a human-sounding AI voice agent
- Learns your business in 30 seconds by scraping your website URL
- Extracts lead data (name, interest, intent) automatically after every call
- Scores leads 0–100 and surfaces them in a real-time dashboard
- Makes outbound follow-up calls to warm leads with a single click
- Supports multiple franchise locations from one dashboard, each with its own AI agent

**Target customer:** Franchise owners (fitness, esports, tutoring, food & beverage, etc.) who miss calls after hours and lose leads.

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool and dev server |
| React Router v6 | 6.x | Client-side routing |
| Tailwind CSS | 3.x | Utility-first styling |
| Clerk | Latest | Authentication (sign-up, sign-in, sessions) |
| Zustand | Latest | Global state (location store, persisted to localStorage) |
| Lucide React | Latest | Icon library |
| Axios | Latest | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 4.x | HTTP server and API |
| TypeScript | 5.x | Type safety |
| Twilio | 6.x | Inbound/outbound voice calls, TwiML, Polly Neural TTS |
| Groq SDK | Latest | AI brain — Llama models via Groq API |
| Supabase JS | 2.x | PostgreSQL database client |
| Cheerio | 1.x | Website scraping for knowledge base |
| Axios | Latest | HTTP requests (scraping, webhooks) |
| Helmet + CORS | Latest | Security headers |
| Zod | Latest | Environment variable validation |

### External Services
| Service | Free Tier | Used For |
|---|---|---|
| **Groq** | 14,400 req/day | AI text generation (Llama 3.1 8B + 3.3 70B) |
| **Twilio** | $15.50 trial credit | Phone numbers, voice calls, speech recognition |
| **Supabase** | 500MB DB, 2 projects | PostgreSQL database (multi-tenant) |
| **Clerk** | 10,000 MAU | Auth — sign-up, sign-in, session tokens |
| **Render** | Free web service | Backend deployment |
| **Vercel** | Free hobby plan | Frontend deployment |

---

## 3. Project Structure

```
BlueSlate-AI Voice Assistant/
├── client/                        # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx                # Root router — decides what to show per auth state
│   │   ├── main.tsx               # React entry point, Clerk provider
│   │   ├── index.css              # Global styles, Tailwind base, custom keyframes
│   │   ├── pages/
│   │   │   ├── Landing.tsx        # Public landing page (shown to unauthenticated visitors)
│   │   │   ├── SignInPage.tsx     # Custom branded sign-in page
│   │   │   ├── SignUpPage.tsx     # Custom branded sign-up page
│   │   │   ├── Onboarding.tsx    # New user setup wizard (4 steps)
│   │   │   ├── Dashboard.tsx     # Main overview — calls, leads, activity
│   │   │   ├── Calls.tsx         # Call history and recordings
│   │   │   ├── Leads.tsx         # Lead CRM with scoring
│   │   │   ├── Knowledge.tsx     # AI knowledge base manager
│   │   │   ├── Campaigns.tsx     # Outbound calls management
│   │   │   ├── Analytics.tsx     # Charts and trends
│   │   │   ├── LiveCall.tsx      # Real-time call monitor
│   │   │   └── Settings.tsx      # Location and AI agent settings
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Sidebar.tsx   # Left nav with all route links
│   │   │       └── TopBar.tsx    # Page title bar with optional action button
│   │   ├── hooks/
│   │   │   └── useLocation.ts    # Zustand store — current location state
│   │   └── lib/
│   │       └── api.ts            # Axios instance with Clerk auth token injection
│   ├── vercel.json               # SPA rewrites for React Router
│   └── index.html
│
├── server/                        # Express backend (Node.js)
│   ├── src/
│   │   ├── index.ts              # Server entry point — starts HTTP + WebSocket
│   │   ├── app.ts                # Express app setup (CORS, middleware, routes)
│   │   ├── config/
│   │   │   ├── env.ts            # Zod env validation — crashes fast if vars missing
│   │   │   └── supabase.ts       # Supabase client (service role key)
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Clerk JWT verification for all API routes
│   │   │   └── twilioSignature.ts# Twilio webhook signature validation
│   │   ├── routes/
│   │   │   ├── index.ts          # Route aggregator + /health endpoints
│   │   │   ├── voice.routes.ts   # /voice/* — Twilio webhooks
│   │   │   ├── locations.routes.ts
│   │   │   ├── knowledge.routes.ts
│   │   │   ├── leads.routes.ts
│   │   │   └── calls.routes.ts
│   │   ├── controllers/          # Request handlers (parse req → call service → respond)
│   │   ├── services/
│   │   │   ├── voice.service.ts  # Core call handling: TwiML generation, turn management
│   │   │   ├── gemini.service.ts # AI service — Groq/Llama (voice + extraction)
│   │   │   ├── outbound.service.ts # Outbound call logic
│   │   │   ├── knowledge.service.ts# KB retrieval and context string builder
│   │   │   ├── leads.service.ts  # Lead scoring and upsert
│   │   │   ├── scraper.service.ts# Website scraping (Cheerio + Axios)
│   │   │   └── wsVoice.service.ts# WebSocket voice for browser testing
│   │   └── types/
│   │       └── index.ts          # All shared TypeScript interfaces
│   └── package.json
│
├── DEPLOYMENT.md                  # Step-by-step deploy guide (Render + Vercel)
└── PROJECT_DOCUMENTATION.md      # This file
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    VISITOR / USER                        │
│                                                         │
│  Browser (Vercel)          Phone (Twilio)               │
│       │                         │                       │
│       │ HTTPS                   │ Voice call            │
│       ▼                         ▼                       │
│  ┌─────────────────┐    ┌───────────────────┐           │
│  │  React Frontend  │    │   Twilio Cloud    │           │
│  │  (Vite / Clerk) │    │  (speech ↔ text)  │           │
│  └────────┬────────┘    └────────┬──────────┘           │
│           │ Clerk JWT             │ Webhook POST         │
│           │                      │                      │
│           ▼                      ▼                      │
│  ┌──────────────────────────────────────────┐           │
│  │          Express API (Render)            │           │
│  │                                          │           │
│  │  /api/locations   /api/leads             │           │
│  │  /api/knowledge   /api/calls             │           │
│  │  /api/voice/incoming                     │           │
│  │  /api/voice/process                      │           │
│  │  /api/voice/outbound                     │           │
│  └──────────┬───────────────────────────────┘           │
│             │                                            │
│       ┌─────┼──────────┐                                │
│       ▼     ▼          ▼                                │
│  Supabase  Groq      Twilio                             │
│  (Postgres)(Llama)   (TTS/STT)                          │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. **Multi-tenant by design** — every database row has `org_id` + `location_id`. One org can have many franchise locations, each with its own AI agent, phone number, and knowledge base.

2. **Twilio handles all voice** — BlueSlate never streams audio itself. Twilio does speech-to-text (STT) and text-to-speech (TTS). BlueSlate only receives transcribed text and returns TwiML instructions.

3. **Groq for AI** — Groq's Llama 3.1 8B Instant has sub-200ms response times, critical for voice calls where silence feels unnatural. Llama 3.3 70B is used for deeper tasks like lead extraction that run after the call ends.

4. **Clerk for auth** — Zero custom auth code. Clerk handles registration, login, sessions, and JWT issuance. The backend verifies Clerk JWTs on every API request.

5. **Supabase as the database** — PostgreSQL with the Supabase JS client (service role key server-side, bypasses RLS intentionally for the API layer).

---

## 5. Three Core Loops

The entire product is built around three loops:

### Loop A — Knowledge Ingestion

```
Owner pastes website URL in onboarding or Knowledge page
      ↓
Scraper fetches HTML (Cheerio + Axios)
Strips scripts, styles, nav; extracts clean text
      ↓
Groq 70B structures raw content into JSON
{services, pricing, hours, FAQ, programs, age_groups, etc.}
      ↓
KnowledgeBase record saved to Supabase (status: active)
      ↓
AI agent now knows your business — ready to answer calls
```

**Files involved:**
`Knowledge.tsx` → `POST /api/knowledge/scrape` → `knowledge.controller.ts` → `scraper.service.ts` → `gemini.service.ts:structureWebsiteContent()` → Supabase

### Loop B — Real-Time Voice Call

```
Phone rings your Twilio number
      ↓
Twilio POST → /api/voice/incoming
      ↓
voice.service.ts looks up Location by called number
Loads active KnowledgeBase for that location
Creates call record (status: in_progress)
Returns TwiML: Polly Neural voices greeting, opens <Gather>
      ↓
Caller speaks → Twilio transcribes speech to text
Twilio POST → /api/voice/process (with SpeechResult)
      ↓
Load all previous call_turns (conversation history)
Build Groq prompt: system prompt + KB context + history
Groq 8B → ≤28-word human-sounding reply
Save caller speech + AI reply as call_turns
Return TwiML: Polly speaks reply, opens new <Gather>
      ↓
Loop continues until call ends or max_turns reached
      ↓
Twilio POST → /api/voice/status (CallStatus: completed)
→ triggers Loop C
```

**Files involved:**
`voice.routes.ts` → `voice.controller.ts` → `voice.service.ts` → `gemini.service.ts:generateVoiceResponse()`

### Loop C — Async Lead Extraction

```
Call ends → Twilio status webhook fires
      ↓
Assemble full transcript from all call_turns (chronological)
      ↓
Groq 70B → extractLeadFromTranscript()
Returns: {caller_name, email, core_interest, call_outcome,
          timeline, specific_questions, objections, next_action}
      ↓
Groq 70B → summarizeCall()
Returns: {summary: "one sentence", sentiment_score: 0.7}
      ↓
Update calls row: duration, transcript, summary, sentiment
Upsert leads row: all extracted fields + score 0–100
      ↓
Lead appears in /leads dashboard < 60 seconds after call
```

**Files involved:**
`voice.service.ts:handleCallStatus()` → `gemini.service.ts:extractLeadFromTranscript()` + `summarizeCall()` → `leads.service.ts`

---

## 6. Backend — How It Works

### Startup (`server/src/index.ts`)
1. `validateEnv()` runs via Zod — if any required env var is missing, the process exits immediately with a clear error message
2. Express HTTP server starts on `PORT` (default 3001)
3. WebSocket server attaches to the same HTTP server on path `/ws` (used by browser voice testing in LiveCall page)

### Authentication Middleware (`middleware/auth.ts`)
- All `/api/locations`, `/api/knowledge`, `/api/leads`, `/api/calls` routes require a valid Clerk JWT in the `Authorization: Bearer <token>` header
- Middleware decodes the JWT, extracts `org_id` + `user_id`, attaches a `tenant` object to `req.tenant`
- Voice routes (`/api/voice/*`) are excluded from Clerk auth — they're validated by Twilio webhook HMAC signature instead

### Voice Controller Flow

**Incoming call (`POST /api/voice/incoming`):**
1. Read `To` field from Twilio params → find which Location owns that phone number
2. Create a `calls` row in Supabase with `status: in_progress`
3. Load active KnowledgeBase for that location
4. Return TwiML: `<Gather input="speech"><Say voice="Polly.Joanna-Neural">greeting</Say></Gather>`

**Process speech (`POST /api/voice/process`):**
1. Load call record + all previous `call_turns` for this `CallSid`
2. Save caller's `SpeechResult` as a new `call_turn` (role: user)
3. Build full system prompt: AI config greeting + knowledge base context string
4. Send to Groq 8B with full conversation history → get ≤28-word reply
5. Save AI reply as a new `call_turn` (role: assistant)
6. Return TwiML: `<Say>reply</Say><Gather>...</Gather>` for the next turn

**Call status (`POST /api/voice/status`):**
1. Triggered by Twilio when `CallStatus` becomes `completed`, `failed`, or `no-answer`
2. Assembles full transcript from `call_turns` table ordered by `turn_index`
3. Runs `extractLeadFromTranscript()` → structured lead JSON
4. Runs `summarizeCall()` → 1-sentence summary + sentiment score
5. Updates `calls` row with final data
6. Upserts `leads` row with score and all extracted fields

### AI Model Strategy

| Task | Model | Why |
|---|---|---|
| Voice replies | `llama-3.1-8b-instant` | Sub-200ms latency — silence on a phone call feels broken |
| Lead extraction | `llama-3.3-70b-versatile` | Better reasoning for accurate structured JSON |
| KB structuring | `llama-3.3-70b-versatile` | Needs to understand complex website content |
| Call summary | `llama-3.3-70b-versatile` | Quality over speed (runs after call ends, not real-time) |

### System Prompt Design

Each AI response is shaped by three layers of context:

```
Layer 1: AI Config (per location)
  "You are Alex, a warm and friendly receptionist at XP League Frisco..."

Layer 2: Knowledge Base context string (per location)
  "Services: Fortnite coaching ($X/mo), Rocket League coaching..."
  "Hours: Mon-Fri 3-9pm, Weekends 10am-8pm"
  "FAQ: How old do players need to be? Answer: 8 and up..."

Layer 3: Hard rules (baked in)
  "MAX 28 words. Use contractions. Ask one follow-up question.
   Never invent prices not in the knowledge base."
```

---

## 7. Frontend — How It Works

### Auth-Aware Routing (`App.tsx`)

The router has three distinct zones:

```
/sign-in/*    → SignInPage (always public, no redirect)
/sign-up/*    → SignUpPage (always public, no redirect)
/onboarding/* → OnboardingRoute (requires auth, standalone page — no sidebar)
/*            → AppLayout (dynamic: Landing or full app, based on auth state)
```

**AppLayout decision tree:**
```
Clerk not loaded yet OR locations still fetching
      → LoadingScreen (spinner, prevents flash)

isSignedIn = false
      → Render <Landing /> inline
        (no redirect — visitor sees landing page at any URL)

isSignedIn = true AND locations.length === 0
      → Navigate to /onboarding
        (new user has no locations = needs setup)

isSignedIn = true AND locations.length > 0
      → Full app: Sidebar + page Routes
```

**Why `locations.length === 0` as the onboarding trigger:**
A user who finished onboarding has at least one location. New users have zero. This is a stateless proxy for "needs setup" with no extra database flags or user metadata.

**Avoiding flash for returning users:**
`locationsLoading` is initialized to `true` ONLY when `locations.length === 0` (no localStorage cache). Returning users already have locations in localStorage, so `locationsLoading` starts as `false` → they see the dashboard immediately.

### Location Store (`hooks/useLocation.ts`)
- Zustand store, persisted to `localStorage` via `zustand/middleware/persist`
- Holds `locations[]` (all locations for the org) and `currentLocation` (the selected one)
- Multi-location owners can switch between locations in the TopBar dropdown
- The API client reads `currentLocation.id` and injects it as `X-Location-Id` on every request

### API Client (`lib/api.ts`)
- Axios instance with `baseURL` = `VITE_API_URL`
- Request interceptor: fetches Clerk session token via `window.__clerk.session.getToken()` → adds `Authorization: Bearer <token>` header automatically
- `window.__clerk` is populated in `AppLayout` and `OnboardingRoute` via a `useEffect` that runs whenever `isSignedIn` changes

---

## 8. UI Page-by-Page Guide

### Landing Page (`/`) — Unauthenticated visitors

Shown **inline** when a visitor hits any URL while not signed in. No redirect loop.

**Sections from top to bottom:**

| Section | What it shows |
|---|---|
| **Nav bar** | Logo, Features / How It Works / Free Access links, Sign In + Get Started Free buttons. Becomes solid/blurred on scroll. |
| **Hero** | Headline ("Your Franchise's AI Receptionist Never Sleeps"), 2 CTAs, 4 stats bar ($0 setup, <2s response, 100% answered, 60s lead capture). Demo widget on the right. |
| **Demo Widget** | 100% offline. Click "Try Live Demo" → 1.5s phone ringing animation → chat with "Alex" (keyword-matching AI). After 3 turns shows "Lead Captured" card. No backend needed — always works. |
| **How It Works** | 3 numbered steps: Connect URL → Assign Phone → Watch Leads |
| **Features** | 6 cards: Never Miss a Call, Knows Your Business, Auto-Captures Leads, Outbound Follow-Ups, Real-Time Dashboard, Multi-Location Ready |
| **Testimonials** | 3 franchise owner quotes with 5-star ratings |
| **Free Access** | Single $0/month card showing all 10 features included. "100% Free During Early Access" badge. |
| **Final CTA** | Large "Start Free — No Card Needed" button with purple glow |
| **Footer** | Brand name, copyright, Privacy / Terms / Contact links |

### Sign In Page (`/sign-in`)

**Left panel (dark branded):**
- 4 feature bullet points (Never miss a lead, AI sounds human, 24/7 coverage, live dashboard)
- A franchise owner testimonial quote
- 3 trust badges: 256-bit encryption, SOC 2 compliant, GDPR ready
- Live green status dot: "AI systems operational"

**Right panel:**
- Clerk `<SignIn>` component
- Custom dark appearance: transparent background, purple `#7c3aed` primary color, dark input fields
- After sign-in: `afterSignInUrl="/"` → lands in AppLayout → goes to dashboard

### Sign Up Page (`/sign-up`)

**Left panel (dark branded):**
- 3 stat numbers: < 2s response · 100% calls answered · 60s lead capture
- 3-step "how it works" mini-guide
- Row of franchise type logos/icons

**Right panel:**
- Clerk `<SignUp>` component with same dark appearance
- After sign-up: `afterSignUpUrl="/onboarding"` → new user goes directly to setup

### Onboarding (`/onboarding`) — First-time users only

4-step wizard. Each step is its own component rendered inside a centered card:

| Step | Name | What it collects | API call |
|---|---|---|---|
| 1 | Welcome | Business name + business type (7 options to pick) | None |
| 2 | Website | Website URL for knowledge base scraping | None |
| 3 | AI Agent | Agent name + personality (Friendly/Professional/Enthusiastic) + custom greeting | None |
| 4 | Complete | Summary card, "Enter Dashboard" button | `POST /api/locations` (creates everything) |

The `POST /api/locations` request sends all collected data at once. The server creates the location record, then immediately triggers knowledge base scraping in the background.

After completion: `navigate('/')` → AppLayout sees `locations.length > 0` → shows full dashboard.

### Dashboard (`/`)

Main overview. Fetches aggregated stats from the API:
- **Stats strip** — Total Calls (30d), Inbound, Outbound, Leads Captured
- **Recent Calls** — last 5–10 calls: caller number, direction badge, status badge, duration, 1-sentence AI summary, timestamp
- **Recent Leads** — last 5 leads: name/phone, core interest, score bar (color-coded: green >70, yellow 40–70, red <40), outcome badge
- **Quick Actions** — shortcut cards to Knowledge, Campaigns, Settings pages

### Calls (`/calls`)

Full paginated call history:
- Filter tabs: All / Inbound / Outbound
- Each row: caller number, direction badge, status badge, duration, AI summary, sentiment indicator, timestamp
- Expandable row (click): full transcript of every turn, raw lead outcome, recording link (if enabled)

### Leads (`/leads`)

Lead CRM:
- Filter by status: All / New / Contacted / Qualified / Booked / Converted
- Each lead card: name, phone, core interest, score 0–100 (color gradient), call outcome badge, "next action" text from AI extraction
- Expandable: full extraction JSON (specific questions asked, objections raised, timeline, etc.), link to the source call, editable notes field
- Status dropdown to move lead through pipeline stages

### Knowledge Base (`/knowledge`)

AI knowledge manager for the current location:
- Shows all added knowledge bases: source URL, status badge, pages scraped count, last scraped date
- "Add URL" button → modal → enters URL → `POST /api/knowledge/scrape` → status shows `processing` then `active`
- Click any active KB → drawer/modal shows structured data AI extracted: services list, pricing, hours, FAQ, programs, key selling points
- Re-scrape button to refresh content when business info changes
- Delete button to remove a KB

### Outbound Calls (`/campaigns`)

Outbound call management page:
- **Stats strip** — Total Dials, Connected, No Answer, Connect Rate %
- **Quick Dial button** — rendered in TopBar via the `action` prop
  - Click → modal opens with: phone number field, contact name field, call context (what to mention) field
  - Submit → `POST /api/voice/outbound` → Twilio dials the number
- **Call history table** — same as Calls page but pre-filtered to `direction === 'outbound'`
- **Best Practices card** — tips: best times to call, what context to include, etc.
- **Empty state** — shown when no outbound calls yet, explains the 3-step process

### Analytics (`/analytics`)

Charts and trends:
- Calls per day (bar chart, last 30 days)
- Lead conversion funnel (new → contacted → qualified → booked)
- Top inquiry topics (what callers ask about most)
- Peak call hours (heatmap by hour of day)
- Sentiment trend over time

### Live Call (`/live-call`)

Real-time call monitor via WebSocket:
- Shows "waiting for call" when idle
- When a call is active: caller number, duration timer, live transcript streaming in as Twilio processes each turn
- Each turn labeled: Caller / AI Agent

### Settings (`/settings`)

Location and AI configuration editor:
- **Business info** section: location name, Twilio phone number, website URL, address, timezone
- **AI Agent** section: agent name, personality dropdown, greeting message, farewell message, max conversation turns
- **Danger zone**: delete location (with confirmation)
- Save button triggers `PATCH /api/locations/:id`

---

## 9. User Flows

### Flow 1 — First-time Visitor (Franchise Owner Prospect)

```
Visits app URL (any path)
      ↓
App.tsx: isSignedIn = false
      → renders <Landing /> inline
      ↓
Scrolls page, tries demo widget
Clicks "Try Live Demo" → ringing → chats with Alex
After 3 turns → sees "Lead Captured" result card
(This simulates what their callers will experience)
      ↓
Clicks "Get Started — It's Free"
      → /sign-up
      ↓
Clerk sign-up form → email verification
→ afterSignUpUrl = "/onboarding"
      ↓
4-step wizard: business name → website URL → AI name → done
      → POST /api/locations creates everything
      → navigate('/')
      ↓
Dashboard — full app loaded
```

### Flow 2 — Returning User (Daily Use)

```
Visits any URL
      ↓
Clerk: isSignedIn = true
Location store: locations already in localStorage
locationsLoading starts as false → no spinner
      ↓
Dashboard renders immediately
API fetches latest data in background
      ↓
User checks /leads for new leads from overnight calls
User opens a lead → views AI extraction → moves status to "Contacted"
User goes to /campaigns → Quick Dial → calls the lead back
```

### Flow 3 — Inbound Call (Core Product Loop)

```
Customer calls the franchise's Twilio number
      ↓
Twilio → POST /api/voice/incoming
  - Looks up Location by phone number
  - Creates call record in DB
  - Returns TwiML: Polly Neural voices the greeting
      ↓
Customer speaks: "Hi, I want to know about your programs"
Twilio transcribes → POST /api/voice/process
  - Loads conversation history
  - Groq 8B generates: "Oh, great! We've got Fortnite and
    Rocket League coaching — skill levels from beginner to
    competitive. Want to try a free session?"
  - Polly speaks the reply
      ↓
Customer: "How much does it cost?"
→ Another /process turn
→ Groq: "First session is totally free! After that we have
   monthly packages. Can I get your name to book that?"
      ↓
...conversation continues...
      ↓
Call ends
Twilio → POST /api/voice/status
  - Groq 70B extracts: {name: "Sarah", interest: "esports",
    outcome: "qualified", timeline: "this_week", score: 78}
  - Lead appears in dashboard within ~45 seconds
```

### Flow 4 — Outbound Call

```
Owner sees lead in /leads: "Sarah, score 78, wants esports coaching"
      ↓
Goes to /campaigns → clicks "Quick Dial"
  Enters: +1-555-0123, "Sarah", "interested in esports programs"
  → POST /api/voice/outbound
      ↓
Twilio dials Sarah's number
When answered: AI introduces itself, mentions her interest
Conversation continues same way as inbound
      ↓
Call ends → transcript + lead update saved
Lead status auto-updated based on outcome
```

### Flow 5 — Knowledge Base Update

```
Owner adds a new service to their website
      ↓
Goes to /knowledge
Clicks "Re-scrape" on existing KB (or "Add URL" for a new page)
      ↓
POST /api/knowledge/scrape
Server fetches HTML → Groq 70B extracts updated info
Status: processing → active (takes ~10-15 seconds)
      ↓
Next call: AI agent now knows about the new service
```

---

## 10. Data Models

### `organizations`
```
id            uuid PK
name          text
clerk_org_id  text (Clerk organization ID)
plan          text (free, growth, enterprise)
created_at    timestamptz
updated_at    timestamptz
```

### `locations`
```
id             uuid PK
org_id         uuid FK → organizations
name           text
phone_number   text (Twilio number assigned to this location)
website_url    text
timezone       text (IANA, e.g. "America/Chicago")
address        text
ai_config      jsonb {
                 agent_name: string,
                 personality: "friendly" | "professional" | "enthusiastic",
                 greeting: string,
                 farewell: string,
                 max_turns: number
               }
created_at     timestamptz
updated_at     timestamptz
```

### `knowledge_bases`
```
id              uuid PK
location_id     uuid FK
org_id          uuid FK
source_url      text
raw_content     text (full scraped text, kept for re-processing)
structured_data jsonb {
                  title, description, location_summary,
                  services[], pricing[], programs[], age_groups[],
                  hours, address, phone, email, faq[], key_selling_points[]
                }
status          enum: pending | processing | active | failed
error_message   text
pages_scraped   int
last_scraped_at timestamptz
created_at      timestamptz
updated_at      timestamptz
```

### `calls`
```
id               uuid PK
location_id      uuid FK
org_id           uuid FK
twilio_call_sid  text UNIQUE (Twilio's call identifier)
from_number      text
to_number        text
direction        enum: inbound | outbound
status           enum: in_progress | completed | failed | no_answer
duration_sec     int
transcript       text (full assembled transcript, assembled after call ends)
summary          text (1-sentence AI summary)
sentiment_score  float (-1.0 to 1.0, 0 is neutral)
recording_url    text
started_at       timestamptz
ended_at         timestamptz
created_at       timestamptz
```

### `call_turns`
```
id          uuid PK
call_id     uuid FK → calls
location_id uuid FK
org_id      uuid FK
role        enum: user | assistant
content     text (what was said)
turn_index  int (0, 1, 2... chronological order)
created_at  timestamptz
```
> Each back-and-forth exchange creates 2 rows: one for caller (user), one for AI (assistant)

### `leads`
```
id              uuid PK
location_id     uuid FK
org_id          uuid FK
call_id         uuid FK → calls
name            text
phone           text
email           text
core_interest   text (e.g. "Fortnite coaching for teen")
call_outcome    enum: qualified | booked | info_requested | callback_needed | not_interested | unknown
status          enum: new | contacted | qualified | booked | converted | dead
score           int 0–100
score_reason    text (why this score was given)
notes           text (owner's manual notes)
raw_extraction  jsonb (full Groq output — specific_questions, objections, timeline, next_action, etc.)
created_at      timestamptz
updated_at      timestamptz
```

---

## 11. API Routes Reference

### Health (no auth)
| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Returns `{status: "ok", timestamp}` |
| GET | `/api/health/db` | Tests Supabase connection, returns row count |

### Voice Webhooks (no Clerk auth — Twilio signature validated)
| Method | Route | Triggered by |
|---|---|---|
| POST | `/api/voice/incoming` | Twilio: new inbound call arrives |
| POST | `/api/voice/process` | Twilio: caller spoke, sends transcript |
| POST | `/api/voice/status` | Twilio: call ended (status callback) |
| POST | `/api/voice/outbound` | Twilio: outbound call was answered |

### Locations (Clerk JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/api/locations` | List all locations for org |
| POST | `/api/locations` | Create location + trigger KB scrape |
| PATCH | `/api/locations/:id` | Update settings (name, AI config, etc.) |
| DELETE | `/api/locations/:id` | Delete location and all related data |

### Knowledge (Clerk JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/api/knowledge` | List knowledge bases for current location |
| POST | `/api/knowledge/scrape` | Scrape URL and run AI structuring |
| DELETE | `/api/knowledge/:id` | Delete knowledge base |

### Calls (Clerk JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/api/calls` | List calls (query: direction, status, from, to date) |
| GET | `/api/calls/:id` | Single call with full transcript turns |

### Leads (Clerk JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/api/leads` | List leads (query: status, min_score, limit) |
| PATCH | `/api/leads/:id` | Update status, notes |

### Outbound (Clerk JWT required)
| Method | Route | Description |
|---|---|---|
| POST | `/api/voice/outbound-initiate` | Start an outbound call from the dashboard |

---

## 12. Environment Variables

### Server (`server/.env`)

```env
# App
NODE_ENV=development
PORT=3001

# Database — supabase.com → Project → Settings → API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Auth — clerk.com → API Keys
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...   # optional, for Clerk webhooks

# Voice — console.twilio.com → Account Info
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# AI — console.groq.com → API Keys (free, 14,400 req/day)
GROQ_API_KEY=gsk_...

# CORS / URLs (update after deploying)
SERVER_URL=https://blueslate-api.onrender.com
CLIENT_URL=https://blueslate.vercel.app
```

### Client (`client/.env.local`)

```env
# Auth — clerk.com → API Keys → Publishable key
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# API — your Render backend URL
VITE_API_URL=https://blueslate-api.onrender.com/api
VITE_WS_URL=wss://blueslate-api.onrender.com
```

---

## Quick Start (Local Development)

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env    # fill in your keys
npm install
npm run dev             # starts on :3001

# Terminal 2 — Frontend
cd client
cp .env.example .env.local   # fill in your keys
npm install
npm run dev             # starts on :5173
```

Open `http://localhost:5173` — unauthenticated visitors see the Landing page. Sign up to enter the app and run through onboarding.

To test voice calls locally, use [ngrok](https://ngrok.com) to expose port 3001:
```bash
ngrok http 3001
# Copy the https URL → update TWILIO webhook in Twilio console
# Update SERVER_URL in server/.env to the ngrok URL
```

---

*Built by NeoAistriq / Fractal KX — BlueSlate AI Voice Assistant*
*Contact: deepthi.br@neoaistriq.com*
