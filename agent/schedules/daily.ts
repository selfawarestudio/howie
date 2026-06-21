import { defineSchedule } from 'eve/schedules';

import slack from '../channels/slack.js';
import twilio from '../channels/twilio.js';

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
  `Combine both into ONE short message. ` +
  `If neither day has a game, stay silent and reply with nothing.`;

export default defineSchedule({
  cron: '0 13 * * *',
  async run({ receive, waitUntil, appAuth }) {
    const today = easternDate(0);
    const yesterday = easternDate(-1);
    const message = dailyPrompt(yesterday, today);

    const jobs: Promise<unknown>[] = [];

    const slackChannelId = process.env.SLACK_CHANNEL_ID;
    if (slackChannelId) {
      jobs.push(
        receive(slack, {
          message,
          target: { channelId: slackChannelId },
          auth: appAuth,
        }),
      );
    }

    const phoneNumber = process.env.TWILIO_TO;
    const from = process.env.TWILIO_FROM;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    if (phoneNumber && (messagingServiceSid || from)) {
      jobs.push(
        receive(twilio, {
          message,
          target: from ? { phoneNumber, from } : { phoneNumber },
          auth: appAuth,
        }),
      );
    }

    if (jobs.length === 0) {
      throw new Error('Configure SLACK_CHANNEL_ID and/or Twilio env vars');
    }

    waitUntil(Promise.all(jobs));
  },
});
