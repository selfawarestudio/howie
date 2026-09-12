# Howie — a Mets game-day agent

A tiny [Eve](https://www.npmjs.com/package/eve) agent that recaps last night and previews tonight every morning at 9am ET via **iMessage** (Linq). Silent when there's nothing to say.

## Architecture

```
agent/
├── instructions.md        # voice — terse, opinionated, Mets POV
├── agent.ts               # model config (Vercel AI Gateway)
├── channels/
│   ├── eve.ts             # HTTP channel for dev QA (curl / TUI)
│   ├── linq.ts            # iMessage via Linq (Vercel Connect)
│   └── daily-digest.ts    # internal channel the 9am cron talks to
├── tools/
│   ├── get_mets_game.ts   # MLB Stats API (Mets = team 121)
│   ├── get_mets_club.ts   # standings, last-ten, streak, transactions
│   └── broadcast_daily_digest.ts
└── schedules/
    └── daily.ts           # 9:00 AM ET
```

The morning cron starts a turn on `daily-digest`. Howie calls `get_mets_game` and `get_mets_club`, then `broadcast_daily_digest` texts the digest to configured iMessage recipients.

## Prerequisites

- Node 24.x
- A Vercel account (deployment, AI Gateway OIDC)
- A Linq line via `eve add channel/linq`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. iMessage (Linq)

Howie uses Eve's first-class [Linq](https://linqapp.com) channel. Vercel Connect holds the API key. The webhook is `/eve/v1/linq`.

This project already has connector `linq/howie` on the dedicated line **+1 (205) 396-6998**. To recreate that on a new project:

```bash
npx eve add channel/linq --yes
```

Complete the browser Connect flow so Eve can create or link a Linq account and number.

**Env vars:**

```
IMESSAGE_RECIPIENTS=+1XXXXXXXXXX,+1YYYYYYYYYY    # who gets the 9am digest (E.164)
IMESSAGE_ALLOW_FROM=+1XXXXXXXXXX                 # optional inbound allow list
LINQ_CONNECT_UID=linq/howie                      # optional; this is the default
```

Only numbers in `IMESSAGE_ALLOW_FROM` can text Howie back. If you omit it, Howie uses `IMESSAGE_RECIPIENTS` (then legacy `IMESSAGE_RECIPIENT`). There is no open-to-the-world default.

**Manual use:** text Howie at +12053966998. Example: "what's the Mets game tonight?"

### 3. Model credential (local dev)

The default model is `openai/gpt-5.4-mini` via the Vercel AI Gateway.

For local `eve dev`, set one of:

- `AI_GATEWAY_API_KEY` from the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway), or
- `vercel link` in this project (OIDC token pulled automatically)

On Vercel production, link the project and the gateway authenticates via OIDC — no API key in env.

## QA (step by step)

Run these in order before deploying.

### Step 1 — Install and typecheck

```bash
npm install
npm run typecheck
npm run build
```

`eve build` should succeed and list `daily` under schedules.

### Step 2 — Smoke-test the MLB tool

Start the dev server:

```bash
npm run dev
```

In another terminal, trigger a session on the Eve HTTP channel:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Call get_mets_game for 2025-09-15 and summarize in one line."}'
```

Copy the `sessionId` from the JSON response, then watch the stream:

```bash
curl -N http://127.0.0.1:3000/eve/v1/session/<sessionId>/stream
```

Confirm the agent calls `get_mets_game` and returns a sensible recap.

### Step 3 — Fire the daily schedule (dev dispatch route)

This runs the same path production cron uses and texts the digest:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/dev/schedules/daily
```

Response example:

```json
{ "scheduleId": "daily", "sessionIds": ["..."] }
```

Watch the stream for that session id. You should see tool calls to `get_mets_game`, then a short assistant message. Check your configured iMessage recipients for the digest.

To test a specific date pair without waiting for real calendar days, temporarily edit the prompt in `agent/schedules/daily.ts` with known game dates (e.g. a 2025 postseason date), re-run Step 3, then revert.

### Step 4 — Verify silence on off days

Trigger the schedule on a date when the Mets have no game yesterday or today (or edit the prompt to use two off-season dates). The agent should end without an assistant message — **nothing should be sent**.

### Step 5 — Health check

```bash
curl http://127.0.0.1:3000/eve/v1/health
```

## Deployment (Vercel)

### Step 1 — Link and set env vars

```bash
vercel link
```

In the Vercel project **Settings → Environment Variables**, add for Production (and Preview if you want):

| Variable | Value |
|----------|-------|
| `IMESSAGE_RECIPIENTS` | comma-separated `+1…` digest recipients |
| `IMESSAGE_ALLOW_FROM` | optional inbound allow list; defaults to recipients |
| `LINQ_CONNECT_UID` | `linq/howie` (optional) |

Do **not** commit `.env`. AI Gateway auth on Vercel is via OIDC after link — no gateway key required in prod.

### Step 2 — Deploy

```bash
vercel deploy --prod
```

Or push to a Git-connected Vercel project.

### Step 3 — Confirm cron

In Vercel **Settings → Cron Jobs**, confirm a job exists for `0 13 * * *` (daily at 13:00 UTC = 9:00 AM EDT).

In November when the US falls back to EST, change `agent/schedules/daily.ts` to `0 14 * * *` and redeploy.

### Step 4 — Production smoke test

```bash
curl https://<your-app>/eve/v1/health
```

Optionally drive the live deployment with the Eve TUI:

```bash
npx eve dev https://<your-app>
```

### Step 5 — Watch the first cron

After 9am ET, check **Observability → Cron Jobs** and **Logs** in Vercel. Confirm the run started a session and the digest arrived on iMessage.

## Things worth knowing

- **Daylight saving.** Cron is UTC. `0 13 * * *` is 9am EDT (summer). In November, switch to `0 14 * * *` for 9am EST.
- **No skip risk.** The recap runs at 9am the next morning, so last night's game is always Final.
- **Scope.** Howie only covers Mets baseball — off-topic messages get a short refusal before the model runs.
- **Dedicated iMessage line.** Howie texts from `+12053966998` through Linq. Replies from unknown numbers are dropped.
- **Beta.** Eve is in public preview — expect framework changes.

## Easy next step

A live-game schedule that posts only on a lead change or a Lindor/Soto homer — `get_mets_game` already returns inning + score, so it's mostly one more schedule file.
