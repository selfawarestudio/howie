# Howie — a Mets game-day agent

A tiny Eve agent that texts you once a day, like a friend who watches every game:
at 10am it recaps last night and previews tonight in a single SMS. Silent when
there's nothing — no game last night and none today means no text.

## Files

```
agent/
├── instructions.md        # the "voice" — terse, opinionated, Mets POV
├── agent.ts               # model config
├── tools/
│   ├── get_mets_game.ts   # free MLB Stats API (no key), Mets = team 121
│   └── send_text.ts       # sends an SMS via Twilio
└── schedules/
    └── daily.ts           # 10:00 AM ET -> recap + preview in one text
```

## Setup

1. Scaffold a fresh Eve project, then drop these files into its `agent/` dir:
   ```bash
   npx eve@latest init howie
   ```
2. Get a Twilio number (the deploy-today path for real SMS):
   - Sign up at twilio.com, buy a phone number (~$1/mo + a fraction of a cent
     per text — one message a day is pennies).
   - Grab your Account SID and Auth Token from the console.
3. Set env vars (locally in `.env`, and in the Vercel project for prod):
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM=+1XXXXXXXXXX     # your Twilio number, E.164
   TWILIO_TO=+1XXXXXXXXXX       # your cell, E.164
   ```
4. Run it and fire a turn manually instead of waiting for 10am:
   ```bash
   pnpm dev
   curl -X POST http://127.0.0.1:3000/eve/v1/session \
     -H 'content-type: application/json' \
     -d '{"message":"Daily check. Recap 2026-06-16 and preview 2026-06-17."}'
   ```
5. Ship it — the schedule becomes a Vercel Cron Job automatically:
   ```bash
   vercel deploy
   ```

## Other ways to text yourself

- **Email-to-SMS gateway (free):** most US carriers forward email to SMS
  (e.g. `5551234567@vtext.com` Verizon, `@txt.att.net` AT&T, `@tmomail.net`
  T-Mobile). Swap `send_text.ts` to send mail via Resend/SMTP. Free, but
  carrier-dependent and increasingly flaky — Twilio is the reliable choice.
- **Pushover / ntfy:** not technically SMS, but lands as a phone notification
  with a one-line HTTP POST and no per-message cost. Simplest of all if you
  don't strictly need a green-bubble text.

## Things worth knowing

- **Daylight saving.** Cron is UTC. `0 14 * * *` is 10am EDT (summer). In
  November when the US falls back to EST, change it to `0 15 * * *`.
- **No skip risk anymore.** Because the recap runs at 10am the next morning,
  last night's game is always Final by then — the old late-night timing gap
  is gone.
- **`defineSchedule` is inferred.** Eve launched today; the schedule handler's
  exact signature isn't in the public docs yet. The cron + `run` shape matches
  Eve's described behavior, but check it against the scaffold's generated
  example (or `node_modules/eve/docs`) and adjust if needed. Everything else
  uses confirmed APIs (`defineAgent`, `defineTool`).
- **Beta.** Eve is in public preview under Vercel beta terms — fine for a
  personal toy, just expect the framework to move under you.

## Easy next step

A live-game schedule that texts you only on a lead change or a Lindor/Soto
homer — the tool already returns inning + score, so it's mostly one more
schedule file.
