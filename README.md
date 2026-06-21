# Howie — a Mets game-day agent

A tiny [Eve](https://www.npmjs.com/package/eve) agent that recaps last night and previews tonight every morning at 9am ET in **Slack**. Silent when there's nothing to say.

## Architecture

```
agent/
├── instructions.md        # voice — terse, opinionated, Mets POV
├── agent.ts               # model config (Vercel AI Gateway)
├── channels/
│   ├── eve.ts             # HTTP channel for dev QA (curl / TUI)
│   └── slack.ts           # Slack channel (Vercel Connect)
├── tools/
│   └── get_mets_game.ts   # free MLB Stats API (Mets = team 121)
└── schedules/
    └── daily.ts           # 9:00 AM ET → Slack
```

The morning cron hands work to **Slack** (`receive(…)`). The agent calls `get_mets_game`, writes a short reply, and the channel posts it automatically.

## Prerequisites

- Node 24.x
- A Vercel account (deployment, AI Gateway OIDC, Slack Connect)
- **Slack:** Self Aware Studio workspace + a channel for Howie

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Slack

Howie uses [Vercel Connect](https://vercel.com/docs/connect) for Slack credentials (no manual bot token in env).

**a. Create a Slack channel** in your workspace (e.g. `#howie`) and invite your wife. Copy the channel ID (`C…` — right-click channel → View channel details, or from the URL).

**b. Create and attach a Connect client:**

```bash
npm i -g vercel@latest
export FF_CONNECT_ENABLED=1

vercel connect create slack --triggers
# Note the UID printed, e.g. slack/howie

vercel connect detach <uid> --yes
vercel connect attach <uid> --triggers \
  --trigger-path /eve/v1/slack --yes
```

Follow the prompts to install the Slack app to **Self Aware Studio** workspace. Grant scopes for posting and reading mentions/DMs.

**c. Env vars:**

```
SLACK_CONNECT_UID=slack/howie      # UID from connect create
SLACK_CHANNEL_ID=C0123456789       # your #howie channel
```

**d. Invite the bot** to the channel: `/invite @Howie` (or whatever the app is named).

**e. Deploy** (Connect triggers need a live URL — see Deployment below).

**Manual use:** `@Howie what's the Mets game tonight?` in the channel works too.

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

This runs the same path production cron uses and posts to Slack:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/dev/schedules/daily
```

Response example:

```json
{ "scheduleId": "daily", "sessionIds": ["..."] }
```

Watch the stream for that session id. You should see tool calls to `get_mets_game`, then a short assistant message. **Check `#howie`** — the Slack channel should get the post.

To test a specific date pair without waiting for real calendar days, temporarily edit the prompt in `agent/schedules/daily.ts` with known game dates (e.g. a 2025 postseason date), re-run Step 3, then revert.

### Step 4 — Verify silence on off days

Trigger the schedule on a date when the Mets have no game yesterday or today (or edit the prompt to use two off-season dates). The agent should end without an assistant message — **nothing should post to Slack**.

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
| `SLACK_CONNECT_UID` | `slack/howie` (from Connect) |
| `SLACK_CHANNEL_ID` | `C…` your channel id |

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

After 9am ET, check **Observability → Cron Jobs** and **Logs** in Vercel. Confirm the run started a session and `#howie` got the morning post.

## Things worth knowing

- **Daylight saving.** Cron is UTC. `0 13 * * *` is 9am EDT (summer). In November, switch to `0 14 * * *` for 9am EST.
- **No skip risk.** The recap runs at 9am the next morning, so last night's game is always Final.
- **Scope.** Howie only covers Mets baseball — off-topic Slack messages get a short refusal before the model runs.
- **Beta.** Eve is in public preview — expect framework changes.

## Easy next step

A live-game schedule that posts only on a lead change or a Lindor/Soto homer — `get_mets_game` already returns inning + score, so it's mostly one more schedule file.
