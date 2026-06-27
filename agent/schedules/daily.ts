import { defineSchedule } from 'eve/schedules';

import dailyDigest from '../channels/daily-digest.js';

function easternDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const dailyPrompt = (yesterday: string, today: string) =>
  `Daily Mets check.\n` +
  `1) Recap last night: call get_mets_game with date ${yesterday}. ` +
  `If it was Final, give the result and the one thing that decided it.\n` +
  `2) Preview today: call get_mets_game with date ${today}. ` +
  `If there's a game, add the matchup and first pitch.\n` +
  `Combine both into ONE short message.\n` +
  `When you have the final digest, call broadcast_daily_digest with that exact text.\n` +
  `If neither day has a game, do not call broadcast_daily_digest and reply with nothing.`;

export default defineSchedule({
  cron: '0 13 * * *',
  async run({ receive, waitUntil, appAuth }) {
    const imessageRecipients =
      process.env.IMESSAGE_RECIPIENTS ?? process.env.IMESSAGE_RECIPIENT;
    const slackChannelId = process.env.SLACK_CHANNEL_ID;
    if (!imessageRecipients?.trim() && !slackChannelId) {
      throw new Error('Configure IMESSAGE_RECIPIENTS/IMESSAGE_RECIPIENT and/or SLACK_CHANNEL_ID');
    }

    const today = easternDate(0);
    const yesterday = easternDate(-1);

    waitUntil(
      receive(dailyDigest, {
        message: dailyPrompt(yesterday, today),
        target: { token: `daily:${today}` },
        auth: appAuth,
      }),
    );
  },
});
