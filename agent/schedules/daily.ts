import { defineSchedule } from 'eve/schedules';

import twilio from '../channels/twilio.js';

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
  async run({ receive, waitUntil, appAuth }) {
    const today = easternDate(0);
    const yesterday = easternDate(-1);
    const phoneNumber = process.env.TWILIO_TO;
    const from = process.env.TWILIO_FROM;
    if (!phoneNumber || !from) {
      throw new Error('Missing TWILIO_TO or TWILIO_FROM');
    }

    waitUntil(
      receive(twilio, {
        message:
          `Daily Mets check.\n` +
          `1) Recap last night: call get_mets_game with date ${yesterday}. ` +
          `If it was Final, give the result and the one thing that decided it.\n` +
          `2) Preview today: call get_mets_game with date ${today}. ` +
          `If there's a game, add the matchup and first pitch.\n` +
          `Combine both into ONE short text. ` +
          `If neither day has a game, stay silent and reply with nothing.`,
        target: { phoneNumber, from },
        auth: appAuth,
      }),
    );
  },
});
