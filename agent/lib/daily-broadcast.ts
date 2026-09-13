import { createHash } from 'node:crypto';

import { fetchMetsGame } from './mlb-game.js';
import { easternDate } from './mlb.js';
import { LIVE_OPT_IN_CTA } from './live-update-messages.js';
import { sendLinqText } from './linq.js';
import { digestRecipients } from './phones.js';

type DeliveryFailure = {
  destination: 'imessage';
  index: number;
  error: unknown;
};

async function digestWithLiveCta(text: string): Promise<string> {
  const digest = text.trim();
  const game = await fetchMetsGame(easternDate(0));
  if (!game.ok || !game.hasGame || game.isFinal) {
    return digest;
  }
  return `${digest}\n\n${LIVE_OPT_IN_CTA}`;
}

export async function broadcastDailyDigest(text: string) {
  const digest = (await digestWithLiveCta(text)).trim();
  if (!digest) {
    return { ok: true as const, delivered: 0, skipped: true as const };
  }

  const imessageRecipients = digestRecipients();
  if (imessageRecipients.length === 0) {
    throw new Error('Configure IMESSAGE_RECIPIENTS or IMESSAGE_RECIPIENT');
  }

  const failures: DeliveryFailure[] = [];
  const deliveries: Promise<void>[] = imessageRecipients.map((phoneNumber, index) =>
    sendLinqText(phoneNumber, digest, digestIdempotencyKey(phoneNumber, digest)).catch((error: unknown) => {
      failures.push({ destination: 'imessage', index, error });
    }),
  );

  await Promise.all(deliveries);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(
        `[howie/daily] delivery failed for iMessage recipient index ${failure.index}:`,
        failure.error,
      );
    }
    throw new AggregateError(
      failures.map((failure) => failure.error),
      `[howie/daily] failed delivery to ${failures.length} destination(s)`,
    );
  }

  console.log(`[howie/daily] broadcast delivered to ${imessageRecipients.length} iMessage recipient(s)`);

  return { ok: true as const, delivered: imessageRecipients.length, skipped: false as const };
}

function digestIdempotencyKey(phoneNumber: string, digest: string) {
  const digestHash = createHash('sha256').update(digest).digest('hex');
  return `howie-digest:${phoneNumber}:${digestHash}`;
}
