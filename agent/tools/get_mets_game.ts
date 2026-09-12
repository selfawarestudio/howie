import { defineTool } from 'eve/tools';
import { z } from 'zod';

import { fetchMetsGame } from '../lib/mlb-game.js';

export type { ScoringPlay } from '../lib/mlb-game.js';

export default defineTool({
  description:
    "Get the New York Mets game for a date (defaults to today, Eastern time). Returns matchup, first pitch, status, probable pitchers, scoring plays, and — if the game is final or in progress — the score and result from the Mets' point of view.",
  inputSchema: z.object({
    date: z
      .string()
      .optional()
      .describe('YYYY-MM-DD. Omit for today (America/New_York).'),
  }),
  async execute({ date }) {
    const result = await fetchMetsGame(date);
    if (!result.ok) return result;
    if (!result.hasGame) return result;

    return {
      ok: true as const,
      hasGame: true as const,
      date: result.date,
      gamePk: result.gamePk,
      status: result.status,
      isFinal: result.isFinal,
      isLive: result.isLive,
      metsHomeOrAway: result.metsHomeOrAway,
      opponent: result.opponent,
      firstPitchET: result.firstPitchET,
      probablePitchers: result.probablePitchers,
      score: result.score,
      result: result.result,
      inning: result.inning,
      scoringPlays: result.scoringPlays,
    };
  },
});
