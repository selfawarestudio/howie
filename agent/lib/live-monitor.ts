import { createHash } from 'node:crypto';

import { fetchMetsGame, type MetsGame } from './mlb-game.js';
import {
  formatFinal,
  formatReminder,
  formatScoringPlay,
} from './live-update-messages.js';
import { getActiveSubscriptions, updateSubscription, type LiveSubscription } from './live-subscriptions.js';
import { sendLinqText } from './linq.js';

const REMINDER_LEAD_MS = 10 * 60 * 1000;

function reminderDue(sub: LiveSubscription, game: MetsGame, now: Date): boolean {
  if (sub.reminderSent || game.isLive || game.isFinal) return false;
  if (!sub.firstPitchAt) return false;
  const firstPitch = new Date(sub.firstPitchAt);
  const reminderAt = firstPitch.getTime() - REMINDER_LEAD_MS;
  return now.getTime() >= reminderAt;
}

function liveMessageIdempotencyKey(phone: string, kind: string, detail: string): string {
  const hash = createHash('sha256').update(`${kind}:${detail}`).digest('hex').slice(0, 16);
  return `howie-live:${phone}:${kind}:${hash}`;
}

async function notify(phone: string, kind: string, detail: string, text: string): Promise<void> {
  await sendLinqText(phone, text, liveMessageIdempotencyKey(phone, kind, detail));
}

async function processSubscription(sub: LiveSubscription, game: MetsGame, now: Date): Promise<void> {
  if (reminderDue(sub, game, now)) {
    await notify(sub.phone, 'reminder', `${sub.gameDate}:${sub.gamePk}`, formatReminder(game));
    await updateSubscription(sub.phone, sub.gameDate, { reminderSent: true });
    sub.reminderSent = true;
  }

  const newPlays = game.scoringPlays.slice(sub.lastScoringPlayCount);
  for (const [index, play] of newPlays.entries()) {
    const playIndex = sub.lastScoringPlayCount + index;
    await notify(
      sub.phone,
      'scoring',
      `${sub.gamePk}:${playIndex}`,
      formatScoringPlay(game, play),
    );
  }

  if (newPlays.length > 0) {
    await updateSubscription(sub.phone, sub.gameDate, {
      lastScoringPlayCount: game.scoringPlays.length,
    });
    sub.lastScoringPlayCount = game.scoringPlays.length;
  }

  if (game.isFinal) {
    await notify(sub.phone, 'final', `${sub.gamePk}:final`, formatFinal(game));
    await updateSubscription(sub.phone, sub.gameDate, { status: 'completed' });
  }
}

export async function runLiveMonitor(): Promise<{ checked: number; games: number }> {
  const subs = await getActiveSubscriptions();
  if (subs.length === 0) {
    return { checked: 0, games: 0 };
  }

  const now = new Date();
  const byDate = new Map<string, LiveSubscription[]>();
  for (const sub of subs) {
    const group = byDate.get(sub.gameDate) ?? [];
    group.push(sub);
    byDate.set(sub.gameDate, group);
  }

  let checked = 0;
  for (const [gameDate, dateSubs] of byDate) {
    const gameResult = await fetchMetsGame(gameDate);
    if (!gameResult.ok || !gameResult.hasGame) {
      console.warn(`[howie/live] no game data for ${gameDate}, cancelling ${dateSubs.length} sub(s)`);
      for (const sub of dateSubs) {
        await updateSubscription(sub.phone, sub.gameDate, { status: 'cancelled' });
      }
      continue;
    }

    for (const sub of dateSubs) {
      await processSubscription(sub, gameResult, now);
      checked += 1;
    }
  }

  return { checked, games: byDate.size };
}
