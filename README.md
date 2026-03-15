# Prompt Guard

Prompt Guard is a local-first AI prompt security platform that prevents sensitive data leaks before users submit text to LLMs.

It combines deterministic pattern detection and OpenClaw semantic scanning, then gives users an immediate safe action path: detect risk, sanitize sensitive values, and continue securely.

---

## Judge Summary (10/10 Rubric Narrative)

### Problem
Teams increasingly paste confidential data into AI tools by accident, including API keys, customer PII, credentials, and internal architecture context.

### Real World Impact
Prompt Guard blocks this leak path at the point of action. It reduces security incidents, privacy violations, and compliance risk before data leaves the browser.

### Implementation
Built with Next.js 14 + TypeScript. Detection combines:
- Pattern scanner for known credential/PII signatures
- OpenClaw integration for contextual AI-level risk detection
- Local-first dashboard + policy persistence via browser localStorage

### Messaging
Simple and actionable workflow:
- Scan prompt
- Explain risk score and issue classes
- Offer safe redacted output immediately

### Execution Potential
Deployable now as:
- Web app scanner/dashboard
- Firefox extension interception layer

No external database is required for core dashboard/policy workflow.

---

## Architecture

```text
User Prompt
  -> POST /api/scan
    -> Pattern Scan (fast regex checks)
    -> OpenClaw AI Scan (semantic risk)
    -> Merged risk score + recommendation
    -> Return scan result to client
      -> Client stores violations in localStorage
      -> Dashboard reads localStorage in real time
```

---

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- AI Security Layer: OpenClaw gateway (MiniMax capable)
- Auth: Clerk (optional in demo mode)
- Persistence mode: Browser localStorage (dashboard + policies)
- Extension: Firefox WebExtension (content interception + sanitize flow)
- Deployment: Vercel

---

## Codebase Map

- app/
  - page.tsx: Main scanner landing page and judge-focused narrative UI
  - dashboard/page.tsx: Local-first dashboard (reads browser-stored violations)
  - policies/page.tsx: Local-first policy management view
  - api/scan/route.ts: Prompt scan API (pattern + OpenClaw AI merge)
  - api/events/route.ts: SSE endpoint (legacy/optional)
  - api/violations/route.ts: Disabled in local-first mode (returns guidance)
  - api/policies/route.ts: Disabled in local-first mode (returns guidance)
- components/
  - PromptScanner.tsx: Core scanner UX, result display, local violation persistence
  - AdminFeed.tsx: Dashboard feed backed by localStorage
  - PolicyBuilder.tsx: Policy CRUD backed by localStorage
  - Navbar.tsx: Navigation shell
- lib/
  - ai-scanner.ts: OpenClaw integration logic
  - pattern-scanner.ts: Deterministic issue detection logic
  - local-storage.ts: Browser persistence helpers for violations and policies
  - db.ts: Legacy Prisma helper (kept for compatibility, not required in local mode)
- extension/
  - manifest.json, content.js, popup/options UI, extension README

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| OPENCLAW_API_KEY | Recommended | OpenClaw gateway/API token |
| OPENCLAW_BASE_URL | Recommended | OpenClaw websocket URL, e.g. ws://127.0.0.1:8090 |
| OPENCLAW_MODEL | Optional | e.g. MiniMax-M2.5 |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Optional | Needed only if Clerk auth is enabled |
| CLERK_SECRET_KEY | Optional | Needed only if Clerk auth is enabled |
| NEXT_PUBLIC_DEMO_MODE | Optional | true to bypass auth for demos |
| DATABASE_URL | Optional | Legacy/compatibility only; core local-first flow does not require hosted DB |

---

## Quick Start

```bash
npm install
npm run dev
```

Open:
- http://localhost:3000

---

## OpenClaw Integration

Prompt Guard uses OpenClaw to enrich security analysis beyond regex:
- Finds implicit sensitive context
- Catches risk semantics and intent
- Produces stronger recommendation quality

Example local config:
- OPENCLAW_BASE_URL=ws://127.0.0.1:8090
- OPENCLAW_MODEL=MiniMax-M2.5

---

## Local-First Storage Design

Dashboard and policy data are stored client-side:
- Violations key: prompt_guard_violations_v1
- Policies key: prompt_guard_policies_v1

Benefits:
- Zero external DB dependency for demos
- Faster setup
- Private local persistence on the user machine

Tradeoff:
- Data is device/browser scoped (not shared across users by default)

---

## Firefox Extension

Extension is located in extension/.

Quick load:
1. Open Firefox -> about:debugging#/runtime/this-firefox
2. Load Temporary Add-on
3. Select extension/manifest.json

---

## Vercel Notes

- Build script is database-free in local-first mode: next build
- Next config is CommonJS to avoid module type warning in Vercel logs

---

## Suggested Demo Flow (60 seconds)

1. Paste a risky prompt (AWS key + PII)
2. Run scan and show score + issue categories
3. Copy redacted output
4. Open Dashboard and show locally persisted violations
5. Open Policies and add an organization-specific custom rule
6. Explain OpenClaw contextual detection advantage

---

## GitHub Upload Checklist

1. Verify env values are local-safe (no secrets committed)
2. Confirm app runs: npm run dev
3. Confirm extension loads from extension/manifest.json
4. Commit and push:

```bash
git add .
git commit -m "Prompt Guard: local-first dashboard, policy storage, UI refresh"
git push origin main
```
