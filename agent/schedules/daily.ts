import { defineSchedule } from 'eve/schedules';

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Eve shipped 2026-06-17 and the exact `defineSchedule` handler signature
// isn't in the public docs yet. The cron + `run` shape matches Eve's described
// behavior, but VERIFY against the scaffold's generated example (or
// node_modules/eve/docs) and adjust if it differs. Everything else uses
// confirmed APIs.
// ─────────────────────────────────────────────────────────────────────────────

// YYYY-MM-DD in Eastern time, offset by whole days.
function easternDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// 10:00 AM ET. Cron is UTC; EDT is UTC-4, so 10:00 ET = 14:00 UTC.
// (Switch to 15:00 UTC when the US falls back to EST in November.)
export default defineSchedule({
  cron: '0 14 * * *',
  async run({ createSession }) {
    const today = easternDate(0);
    const yesterday = easternDate(-1);

    await createSession({
      message:
        `Daily Mets check.\n` +
        `1) Recap last night: call get_mets_game with date ${yesterday}. ` +
        `If it was Final, give the result and the one thing that decided it.\n` +
        `2) Preview today: call get_mets_game with date ${today}. ` +
        `If there's a game, add the matchup and first pitch.\n` +
        `Combine both into ONE short text via send_text. ` +
        `If neither day has a game, stay silent and send nothing.`,
    });
  },
});
