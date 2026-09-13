import { fetchMetsGame } from './mlb-game.js';
import { easternDate } from './mlb.js';
import {
  formatAlreadySubscribed,
  formatLiveOptInConfirmation,
  formatLiveUpdatesCancelled,
  formatNoActiveSubscription,
  formatNoGameTonight,
} from './live-update-messages.js';
import {
  cancelSubscription,
  getActiveSubscriptionForPhone,
  upsertSubscription,
} from './live-subscriptions.js';
import { normalizeHandle } from './phones.js';

const LIVE_COMMAND = /^(live|live updates?)$/i;
const STOP_COMMAND = /^(stop|stop live|stop updates?|unsubscribe)$/i;

export function isLiveUpdateCommand(text: string): boolean {
  const trimmed = text.trim();
  return LIVE_COMMAND.test(trimmed) || STOP_COMMAND.test(trimmed);
}

export async function handleLiveUpdateCommand(phone: string, text: string): Promise<string> {
  const trimmed = text.trim();
  if (STOP_COMMAND.test(trimmed)) {
    const cancelled = await cancelSubscription(normalizeHandle(phone));
    return cancelled ? formatLiveUpdatesCancelled() : formatNoActiveSubscription();
  }

  if (!LIVE_COMMAND.test(trimmed)) {
    return formatNoGameTonight();
  }

  const today = easternDate(0);
  const gameResult = await fetchMetsGame(today);
  if (!gameResult.ok) {
    return 'Could not load tonight\'s game. Try again in a minute.';
  }
  if (!gameResult.hasGame) {
    return formatNoGameTonight();
  }

  const existing = await getActiveSubscriptionForPhone(phone);
  if (existing) {
    return formatAlreadySubscribed(gameResult);
  }

  await upsertSubscription({
    phone,
    gamePk: gameResult.gamePk,
    gameDate: gameResult.date,
    opponent: gameResult.opponent,
    firstPitchAt: gameResult.firstPitchAt,
    lastScoringPlayCount: gameResult.scoringPlays.length,
  });

  return formatLiveOptInConfirmation(gameResult);
}
