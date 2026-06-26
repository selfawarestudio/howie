import { defineSchedule } from 'eve/schedules';
import type { ScheduleHandlerArgs } from 'eve/schedules';
import type { Session } from 'eve/channels';

import dailyDigest from '../channels/daily-digest.js';
import { sendToSlackChannel } from '../lib/slack.js';
import { sendToSpace } from '../lib/spectrum.js';

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

function normalizeDigest(message: string | null): string | null {
  const trimmed = message?.trim();
  return trimmed ? trimmed : null;
}

async function collectFinalMessage(session: Session): Promise<string | null> {
  const stream = await session.getEventStream();
  let finalMessage: string | null = null;

  for await (const event of stream) {
    switch (event.type) {
      case 'message.completed':
        if (event.data.finishReason !== 'tool-calls') {
          finalMessage = event.data.message;
        }
        break;
      case 'step.failed':
      case 'turn.failed':
      case 'session.failed':
        throw new Error(
          `Daily digest generation failed (${event.data.code}): ${event.data.message}`,
        );
      case 'session.waiting':
      case 'session.completed':
        return normalizeDigest(finalMessage);
    }
  }

  return normalizeDigest(finalMessage);
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

type DeliveryFailure = {
  destination: 'imessage' | 'slack';
  index?: number;
  error: unknown;
};

async function generateDigest(
  { receive, appAuth }: Pick<ScheduleHandlerArgs, 'receive' | 'appAuth'>,
  message: string,
  today: string,
): Promise<string | null> {
  const session = await receive(dailyDigest, {
    message,
    target: { token: `daily:${today}:${Date.now()}` },
    auth: appAuth,
  });

  return collectFinalMessage(session);
}

async function deliverDigest(
  digest: string,
  imessageRecipients: string[],
  slackChannelId: string | undefined,
) {
  const failures: DeliveryFailure[] = [];
  const deliveries: Promise<void>[] = imessageRecipients.map((phoneNumber, index) =>
    sendToSpace({ spaceId: null, recipientPhone: phoneNumber }, digest).catch((error: unknown) => {
      failures.push({ destination: 'imessage', index, error });
    }),
  );

  if (slackChannelId) {
    deliveries.push(
      sendToSlackChannel(slackChannelId, digest).catch((error: unknown) => {
        failures.push({ destination: 'slack', error });
      }),
    );
  }

  await Promise.all(deliveries);

  if (failures.length > 0) {
    for (const failure of failures) {
      const label =
        failure.destination === 'imessage'
          ? `iMessage recipient index ${failure.index}`
          : 'Slack channel';
      console.error(`[howie/daily] delivery failed for ${label}:`, failure.error);
    }
    throw new AggregateError(
      failures.map((failure) => failure.error),
      `[howie/daily] failed delivery to ${failures.length} destination(s)`,
    );
  }
}

async function runDaily(args: Pick<ScheduleHandlerArgs, 'receive' | 'appAuth'>) {
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

  console.log('[howie/daily] generating digest for scheduled broadcast');
  const digest = await generateDigest(args, message, today);
  if (!digest) {
    console.log('[howie/daily] no digest generated; skipping delivery');
    return;
  }

  console.log(
    `[howie/daily] digest generated; delivering to ${imessageRecipients.length} iMessage recipient(s)` +
      (slackChannelId ? ' and Slack' : ''),
  );
  await deliverDigest(digest, imessageRecipients, slackChannelId);
  console.log('[howie/daily] digest delivery complete');
}

export default defineSchedule({
  cron: '0 13 * * *',
  async run({ receive, waitUntil, appAuth }) {
    waitUntil(runDaily({ receive, appAuth }));
  },
});
