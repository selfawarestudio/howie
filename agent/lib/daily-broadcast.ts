import { sendToSlackChannel } from './slack.js';
import { sendToSpace } from './spectrum.js';

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

type DeliveryFailure = {
  destination: 'imessage' | 'slack';
  index?: number;
  error: unknown;
};

export async function broadcastDailyDigest(text: string) {
  const digest = text.trim();
  if (!digest) {
    return { ok: true as const, delivered: 0, skipped: true as const };
  }

  const imessageRecipients = parsePhoneList(
    process.env.IMESSAGE_RECIPIENTS ?? process.env.IMESSAGE_RECIPIENT,
  );
  const slackChannelId = process.env.SLACK_CHANNEL_ID;
  if (imessageRecipients.length === 0 && !slackChannelId) {
    throw new Error('Configure IMESSAGE_RECIPIENTS/IMESSAGE_RECIPIENT and/or SLACK_CHANNEL_ID');
  }

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

  const delivered = imessageRecipients.length + (slackChannelId ? 1 : 0);
  console.log(
    `[howie/daily] broadcast delivered to ${imessageRecipients.length} iMessage recipient(s)` +
      (slackChannelId ? ' and Slack' : ''),
  );

  return { ok: true as const, delivered, skipped: false as const };
}
