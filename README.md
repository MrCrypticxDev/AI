# Prompt Guard

Real-time AI prompt security scanner. Detects API keys, PII, passwords, and sensitive context before they reach an LLM.

## Stack

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Real-time**: Server-Sent Events (SSE) — no external service needed
- **AI scanning**: OpenClaw (OpenAI-compatible) with OpenAI fallback
- **Database**: Prisma + PostgreSQL
- **Auth**: Clerk  
- **Deploy**: Vercel + GitHub Actions

---

## Quick Start (5 steps)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your keys
cp .env.example .env.local

# 3. Generate Prisma client and create database
npx prisma generate
npx prisma db push

# 4. Run the dev server
npm run dev

# 5. Open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENCLAW_API_KEY` | Yes* | Your OpenClaw API key |
| `OPENCLAW_BASE_URL` | Recommended | Your OpenClaw API base URL (OpenAI-compatible) |
| `OPENCLAW_MODEL` | No | OpenClaw model name (e.g. `minimax-m1`) |
| `OPENAI_API_KEY` | No | Fallback if OpenClaw key is not provided |
| `OPENAI_BASE_URL` | No | Optional OpenAI-compatible fallback base URL |
| `OPENAI_MODEL` | No | Fallback model (default: `gpt-4o-mini`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes* | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes* | Clerk secret key |
| `NEXT_PUBLIC_DEMO_MODE` | No | Set `true` to bypass auth entirely |

*Not required if `NEXT_PUBLIC_DEMO_MODE=true` and you are okay with pattern-only scanning

**Get Clerk keys**: https://clerk.com (free, takes 2 minutes)

---

## Features

- **Pattern scanner**: Instantly detects AWS keys, OpenClaw/OpenAI keys, GitHub tokens, JWTs, private keys, SSNs, credit cards, emails, phone numbers, and passwords via regex
- **AI deep scan**: Semantic analysis for context-level sensitive data (trade secrets, internal architecture, implicit credentials)
- **Instant redaction**: One-click copy of a safe version with typed `[REDACTED-TYPE]` placeholders
- **Live admin dashboard**: Real-time SSE feed of all violations, filterable by severity
- **Custom policies**: Add regex or keyword rules for your org-specific sensitive data
- **Role-based access**: Citizen vs admin via Clerk metadata

---

## Demo Script (60 seconds for judges)

1. Open `http://localhost:3000`
2. Click **"AWS Keys"** demo button
3. Click **Scan Prompt** — watch risk score animate to 94/100
4. See AWS key and secret highlighted, matched, and redacted
5. Copy the safe version with one click
6. Open **Dashboard** — violation appears live in the feed
7. Open **Policies** — add a custom rule for your org

---

## Architecture

```
User prompt → POST /api/scan
               ├── Pattern scanner (regex, <5ms)
               ├── AI scanner (OpenClaw/OpenAI-compatible, ~200ms)
               ├── Merge results + compute risk score
               ├── Save violation to PostgreSQL (redacted only)
               └── Broadcast to SSE /api/events
                    └── AdminFeed component updates live
```

---

## Production Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Set `DATABASE_URL` to your PostgreSQL connection string
5. Set `OPENCLAW_API_KEY`, `OPENCLAW_BASE_URL`, and `OPENCLAW_MODEL`
6. GitHub Actions will auto-deploy on every push to `main`

---

## Firefox Extension

This repo also includes the Firefox extension build in [extension/](extension/).

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select [extension/manifest.json](extension/manifest.json)
4. Open the extension popup and verify Prompt Guard is active

---

## GitHub Upload Checklist

1. Confirm app env uses your active gateway: `OPENCLAW_BASE_URL=ws://127.0.0.1:8090`
2. Ensure secrets are not committed (`.env` should remain ignored)
3. Update any remaining naming to **Prompt Guard**
4. Run local validation:

```bash
npm install
npm run dev
```

5. Test extension loading with [extension/manifest.json](extension/manifest.json)
6. Commit and push:

```bash
git add .
git commit -m "Prepare Prompt Guard app + extension for GitHub"
git push origin main
```
