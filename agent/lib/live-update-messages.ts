import type { MetsGame, ScoringPlay } from './mlb-game.js';

export const LIVE_OPT_IN_CTA =
  'Reply LIVE for tonight: reminder before first pitch, scoring plays, final.';

export function formatLiveOptInConfirmation(game: MetsGame): string {
  const opponent = game.opponent ?? 'the opponent';
  return (
    `You're in vs ${opponent} tonight. Reminder 10 min before first pitch. Reply STOP to cancel.`
  );
}

export function formatAlreadySubscribed(game: MetsGame): string {
  const opponent = game.opponent ?? 'the opponent';
  return `Already tracking tonight vs ${opponent}. Reply STOP to cancel.`;
}

export function formatNoGameTonight(): string {
  return 'No Mets game on tap tonight.';
}

export function formatLiveUpdatesCancelled(): string {
  return 'Live updates off for tonight.';
}

export function formatNoActiveSubscription(): string {
  return 'No live updates running for tonight.';
}

export function formatReminder(game: MetsGame): string {
  const opponent = game.opponent ?? 'the opponent';
  const time = game.firstPitchET ?? 'soon';
  const venue = game.metsHomeOrAway === 'home' ? 'Citi Field' : 'on the road';
  const pitchers = [game.probablePitchers.mets, game.probablePitchers.opponent]
    .filter(Boolean)
    .join(' vs ');
  const matchup = pitchers ? ` ${pitchers}.` : '';
  return `First pitch in 10 vs ${opponent}, ${time} ET, ${venue}.${matchup}`;
}

export function formatScoringPlay(game: MetsGame, play: ScoringPlay): string {
  const score =
    game.score !== null
      ? ` Mets ${game.score.mets}, ${game.opponent ?? 'opp'} ${game.score.opponent ?? 0}.`
      : '';
  const half =
    play.half === 'top' ? 'top' : play.half === 'bottom' ? 'bottom' : '';
  const inning = play.inning !== null ? `${half} ${play.inning}`.trim() : '';
  const prefix = inning ? `${inning}. ` : '';
  return `${prefix}${play.description}.${score}`.trim();
}

export function formatFinal(game: MetsGame): string {
  const opponent = game.opponent ?? 'the opponent';
  const mets = game.score?.mets ?? 0;
  const opp = game.score?.opponent ?? 0;

  if (game.result === 'win') {
    return `Final: Mets ${mets}, ${opponent} ${opp}. Put it in the books.`;
  }
  if (game.result === 'loss') {
    return `Final: Mets ${mets}, ${opponent} ${opp}. Tough one.`;
  }
  return `Final: Mets ${mets}, ${opponent} ${opp}.`;
}
