# BlueSlate — Deployment Guide

Complete step-by-step guide to deploy backend on **Render** and frontend on **Vercel**.

---

## Overview

| Part | Platform | Folder | URL |
|------|----------|--------|-----|
| Backend (API) | Render.com | `server/` | `https://blueslate-api.onrender.com` |
| Frontend (React) | Vercel | `client/` | `https://blueslate.vercel.app` |

---

## Step 1 — Deploy the Backend on Render

### 1.1 Create a Render account
Go to [render.com](https://render.com) → Sign up with GitHub.

### 1.2 Create a new Web Service
1. Click **New → Web Service**
2. Connect your GitHub repo
3. Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `blueslate-api` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/index.js` |
| **Instance Type** | Free (or Starter for always-on) |

### 1.3 Add Environment Variables
In Render → Your Service → **Environment**, add:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
CLERK_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
GROQ_API_KEY=gsk_...
SERVER_URL=https://blueslate-api.onrender.com
CLIENT_URL=https://blueslate.vercel.app
```

> **Note:** `SERVER_URL` must be your Render URL and `CLIENT_URL` must be your Vercel URL. Update these after you deploy both.

### 1.4 Deploy
Click **Create Web Service**. Render will build and deploy automatically.
First deploy takes ~3 minutes. Free tier sleeps after 15 min of inactivity (first request wakes it up in ~30s).

### 1.5 Verify backend is working
Open: `https://blueslate-api.onrender.com/api/health`
You should see: `{"status":"ok",...}`

---

## Step 2 — Deploy the Frontend on Vercel

### 2.1 Create a Vercel account
Go to [vercel.com](https://vercel.com) → Sign up with GitHub.

### 2.2 Import your project
1. Click **Add New → Project**
2. Import your GitHub repository
3. Vercel will auto-detect it's a Vite project

### 2.3 Configure build settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `client` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> **IMPORTANT:** Set the Root Directory to `client` — click the pencil icon next to it.

### 2.4 Add Environment Variables
In Vercel → Your Project → **Settings → Environment Variables**, add:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://blueslate-api.onrender.com/api
VITE_WS_URL=wss://blueslate-api.onrender.com
```

> Use `pk_live_...` for production and `pk_test_...` for preview deployments.

### 2.5 Deploy
Click **Deploy**. Takes ~2 minutes.

### 2.6 Add a `vercel.json` for client-side routing
Client-side routing (React Router) requires all routes to serve `index.html`. Create this file in `client/`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Without this file, refreshing on any route other than `/` will return a 404.

---

## Step 3 — Configure Twilio Webhooks

After both are deployed, set your Twilio phone number webhooks.

1. Log in to [twilio.com/console](https://console.twilio.com)
2. Go to **Phone Numbers → Manage → Active numbers**
3. Click your number
4. Set the following:

| Field | Value |
|-------|-------|
| **Voice → A call comes in** | `https://blueslate-api.onrender.com/api/voice/incoming` |
| **HTTP Method** | `POST` |
| **Call Status Changes** | `https://blueslate-api.onrender.com/api/voice/status` |

---

## Step 4 — Configure Clerk (Auth)

1. Log in to [clerk.com](https://clerk.com) → Your application
2. Go to **API Keys** → copy:
   - `Publishable key` → goes in Vercel env as `VITE_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → goes in Render env as `CLERK_SECRET_KEY`

3. Go to **Paths** → set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/`
   - After sign-up: `/onboarding`

4. Go to **Allowed redirect URLs** → add:
   - `https://blueslate.vercel.app`
   - `http://localhost:5173` (for local dev)

---

## Step 5 — Update CORS URLs

After both are deployed, go to Render → Environment Variables and update:
```
SERVER_URL=https://blueslate-api.onrender.com   (your actual Render URL)
CLIENT_URL=https://blueslate.vercel.app          (your actual Vercel URL)
```

Trigger a re-deploy on Render after updating.

---

## Troubleshooting

### Frontend 404 on page refresh
Add `client/vercel.json` with rewrites (see Step 2.6 above).

### "Failed to fetch" errors in frontend
- Check `VITE_API_URL` in Vercel env matches your Render URL exactly
- Make sure there's no trailing slash on `VITE_API_URL`
- Check CORS: `CLIENT_URL` on Render must match your Vercel URL

### Render backend sleeping (free tier)
Free tier sleeps after 15 min. First request after sleep takes ~30s.
To prevent this:
- Upgrade to **Starter** ($7/month) for always-on
- Or use a free cron service (e.g. cron-job.org) to ping `/api/health` every 10 minutes

### Twilio webhooks failing
- Confirm `SERVER_URL` in Render env is your actual Render URL
- Confirm the webhook URLs in Twilio use `https://` (not http)
- Check Render logs for errors: Dashboard → Your service → **Logs**

### Clerk redirect loop
- Make sure `afterSignInUrl="/"` and `afterSignUpUrl="/onboarding"` in your SignInPage/SignUpPage
- Add your Vercel domain to Clerk's allowed origins

### Build fails on Vercel
Common issues:
1. **Root directory not set to `client`** — most common mistake
2. **Missing env vars** — check all 3 VITE_ vars are set
3. **TypeScript errors** — run `npm run build` locally in `client/` to check

---

## Local Development

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

Local env for frontend (`client/.env.local`):
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

---

## Environment Variables Reference

### Server (`server/.env`)
| Variable | Where to get it |
|----------|----------------|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role key |
| `CLERK_SECRET_KEY` | Clerk → API Keys → Secret keys |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | Twilio Console → Phone Numbers |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `SERVER_URL` | Your Render service URL |
| `CLIENT_URL` | Your Vercel project URL |

### Client (`client/.env.local`)
| Variable | Where to get it |
|----------|----------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys → Publishable key |
| `VITE_API_URL` | Your Render URL + `/api` |
| `VITE_WS_URL` | Your Render URL as `wss://` |
