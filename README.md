# Howie — a Mets game-day agent

A tiny [Eve](https://www.npmjs.com/package/eve) agent that texts you once a day, like a friend who watches every game: at 10am ET it recaps last night and previews tonight in a single SMS. Silent when there's nothing — no game last night and none today means no text.

## Architecture

```
agent/
├── instructions.md        # voice — terse, opinionated, Mets POV
├── agent.ts               # model config (Vercel AI Gateway)
├── channels/
│   ├── eve.ts             # HTTP channel for dev QA (curl / TUI)
│   └── twilio.ts          # SMS delivery via Twilio channel
├── tools/
│   └── get_mets_game.ts   # free MLB Stats API (Mets = team 121)
└── schedules/
    └── daily.ts           # 10:00 AM ET → proactive SMS via Twilio
```

The morning cron hands work to the **Twilio channel** (`receive(twilio, …)`). The agent calls `get_mets_game`, writes a short reply, and Eve's Twilio channel sends that reply as SMS. No custom send tool.

## Prerequisites

- Node 24.x
- A Twilio account with a phone number (~$1/mo + per-SMS fees)
- A Vercel account (for deployment and AI Gateway OIDC in prod)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Twilio

1. Sign up at [twilio.com](https://www.twilio.com) and buy a phone number.
2. Copy Account SID and Auth Token from the console.
3. Copy `.env.example` to `.env` and fill in:

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+1XXXXXXXXXX     # your Twilio number (E.164)
TWILIO_TO=+1XXXXXXXXXX       # your cell (E.164)
```

4. **Optional — inbound SMS:** In the Twilio console, set your number's **Messaging webhook** to:

```
https://<your-vercel-app>/eve/v1/twilio/messages
```

   Method: `POST`. Only `TWILIO_TO` can reach the agent (`allowFrom`).

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

### Step 2 — Smoke-test the MLB tool (no SMS)

Start the dev server:

```bash
npm run dev
```

In another terminal, trigger a session on the Eve HTTP channel (no Twilio needed yet):

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Call get_mets_game for 2025-09-15 and summarize in one line. Do not mention SMS."}'
```

Copy the `sessionId` from the JSON response, then watch the stream:

```bash
curl -N http://127.0.0.1:3000/eve/v1/session/<sessionId>/stream
```

Confirm the agent calls `get_mets_game` and returns a sensible recap.

### Step 3 — Fire the daily schedule (dev dispatch route)

This runs the same path production cron uses, but delivers via Twilio:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/dev/schedules/daily
```

Response example:

```json
{ "scheduleId": "daily", "sessionIds": ["..."] }
```

Watch the stream for that session id. You should see tool calls to `get_mets_game`, then a short assistant message. **Check your phone** — the Twilio channel sends the final reply as SMS.

To test a specific date pair without waiting for real calendar days, temporarily edit the prompt in `agent/schedules/daily.ts` with known game dates (e.g. a 2025 postseason date), re-run Step 3, then revert.

### Step 4 — Verify silence on off days

Trigger the schedule on a date when the Mets have no game yesterday or today (or edit the prompt to use two off-season dates). The agent should end without an assistant message — **no SMS should arrive**.

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
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | your token |
| `TWILIO_FROM` | `+1...` Twilio number |
| `TWILIO_TO` | `+1...` your cell |

Do **not** commit `.env`. AI Gateway auth on Vercel is via OIDC after link — no gateway key required in prod.

### Step 2 — Deploy

```bash
vercel deploy --prod
```

Or push to a Git-connected Vercel project.

### Step 3 — Confirm cron

In Vercel **Settings → Cron Jobs**, confirm a job exists for `0 14 * * *` (daily at 14:00 UTC = 10:00 AM EDT).

In November when the US falls back to EST, change `agent/schedules/daily.ts` to `0 15 * * *` and redeploy.

### Step 4 — Production smoke test

```bash
curl https://<your-app>/eve/v1/health
```

Optionally drive the live deployment with the Eve TUI:

```bash
npx eve dev https://<your-app>
```

### Step 5 — Twilio webhook (optional)

If you want to text Howie back, set the Twilio number's Messaging webhook to:

```
https://<your-app>/eve/v1/twilio/messages
```

### Step 6 — Watch the first cron

After 10am ET, check **Observability → Cron Jobs** and **Logs** in Vercel. Confirm the run started a session and your phone received the text.

## Things worth knowing

- **Daylight saving.** Cron is UTC. `0 14 * * *` is 10am EDT (summer). In November, switch to `0 15 * * *` for 10am EST.
- **No skip risk.** The recap runs at 10am the next morning, so last night's game is always Final.
- **Twilio compliance.** You are responsible for SMS consent/opt-out rules for outbound texts to your own number this is usually fine; see Eve's Twilio channel docs for production use with other recipients.
- **Beta.** Eve is in public preview — expect framework changes.

## Easy next step

A live-game schedule that texts only on a lead change or a Lindor/Soto homer — `get_mets_game` already returns inning + score, so it's mostly one more schedule file.
