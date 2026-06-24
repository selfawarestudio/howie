import { defineSchedule } from 'eve/schedules';
import type { Session } from 'eve/channels';

import imessage from '../channels/imessage.js';
import slack from '../channels/slack.js';

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

async function waitForSession(session: Session) {
  const stream = await session.getEventStream();
  for await (const event of stream) {
    if (
      event.type === 'session.waiting' ||
      event.type === 'session.completed' ||
      event.type === 'session.failed'
    ) {
      return;
    }
  }
}

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
    const imessageRecipients = parsePhoneList(
      process.env.IMESSAGE_RECIPIENTS ?? process.env.IMESSAGE_RECIPIENT,
    );
    const slackChannelId = process.env.SLACK_CHANNEL_ID;
    if (imessageRecipients.length === 0 && !slackChannelId) {
      throw new Error('Configure IMESSAGE_RECIPIENTS/IMESSAGE_RECIPIENT and/or SLACK_CHANNEL_ID');
    }

    const today = easternDate(0);
    const yesterday = easternDate(-1);
    const message = dailyPrompt(yesterday, today);

    for (const phoneNumber of imessageRecipients) {
      waitUntil(
        receive(imessage, {
          message,
          target: { phoneNumber },
          auth: appAuth,
        }).then(waitForSession),
      );
    }

    if (slackChannelId) {
      waitUntil(
        receive(slack, {
          message,
          target: { channelId: slackChannelId },
          auth: appAuth,
        }).then(waitForSession),
      );
    }
  },
});
