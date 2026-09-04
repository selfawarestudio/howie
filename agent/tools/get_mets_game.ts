import { defineTool } from 'eve/tools';
import { z } from 'zod';

import {
  METS_ID,
  asNumber,
  asRecord,
  asString,
  easternTime,
  resolveGameDate,
} from '../lib/mlb.js';

const API = 'https://statsapi.mlb.com/api/v1/schedule';

export type ScoringPlay = {
  inning: number | null;
  half: 'top' | 'bottom' | null;
  event: string | null;
  description: string;
  batter: string | null;
};

function parseScoringPlay(value: unknown): ScoringPlay | null {
  const play = asRecord(value);
  if (!play) return null;
  const result = asRecord(play.result);
  const about = asRecord(play.about);
  const matchup = asRecord(play.matchup);
  const batter = asRecord(matchup?.batter);
  const description = asString(result?.description);
  if (!description) return null;
  const halfRaw = asString(about?.halfInning);
  const half = halfRaw === 'top' || halfRaw === 'bottom' ? halfRaw : null;
  return {
    inning: asNumber(about?.inning),
    half,
    event: asString(result?.event),
    description,
    batter: asString(batter?.fullName),
  };
}

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
    const day = resolveGameDate(date);
    const url =
      `${API}?sportId=1&teamId=${METS_ID}&date=${day}` +
      `&hydrate=probablePitcher,linescore,team,scoringplays,decisions`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'mets-game-day-agent' },
    });
    if (!res.ok) {
      return { ok: false as const, error: `MLB API ${res.status}`, date: day };
    }

    const data: unknown = await res.json();
    const root = asRecord(data);
    const dates = Array.isArray(root?.dates) ? root.dates : [];
    const firstDate = asRecord(dates[0]);
    const games = Array.isArray(firstDate?.games) ? firstDate.games : [];
    if (games.length === 0) {
      return { ok: true as const, hasGame: false as const, date: day };
    }

    const parsedGames = games.map((game) => asRecord(game)).filter((game) => game !== null);
    const game =
      parsedGames.find((entry) => {
        const status = asRecord(entry.status);
        return asString(status?.abstractGameState) !== 'Final';
      }) ?? parsedGames[parsedGames.length - 1];

    if (!game) {
      return { ok: true as const, hasGame: false as const, date: day };
    }

    const teams = asRecord(game.teams);
    const home = asRecord(teams?.home);
    const away = asRecord(teams?.away);
    const homeTeam = asRecord(home?.team);
    const metsAreHome = asNumber(homeTeam?.id) === METS_ID;
    const mets = metsAreHome ? home : away;
    const opp = metsAreHome ? away : home;
    const oppTeam = asRecord(opp?.team);
    const metsPitcher = asRecord(mets?.probablePitcher);
    const oppPitcher = asRecord(opp?.probablePitcher);
    const status = asRecord(game.status);
    const linescore = asRecord(game.linescore);
    const abstractState = asString(status?.abstractGameState);
    const isFinal = abstractState === 'Final';
    const isLive = abstractState === 'Live';
    const metsScore = asNumber(mets?.score);
    const oppScore = asNumber(opp?.score);

    let result: 'win' | 'loss' | 'tie' | null = null;
    if (isFinal && metsScore !== null && oppScore !== null) {
      result = metsScore > oppScore ? 'win' : metsScore < oppScore ? 'loss' : 'tie';
    }

    const scoringPlays = Array.isArray(game.scoringPlays)
      ? game.scoringPlays.map(parseScoringPlay).filter((play) => play !== null)
      : [];

    return {
      ok: true as const,
      hasGame: true as const,
      date: day,
      gamePk: asNumber(game.gamePk),
      status: asString(status?.detailedState) ?? 'Unknown',
      isFinal,
      isLive,
      metsHomeOrAway: metsAreHome ? ('home' as const) : ('away' as const),
      opponent: asString(oppTeam?.name),
      firstPitchET: asString(game.gameDate) ? easternTime(String(game.gameDate)) : null,
      probablePitchers: {
        mets: asString(metsPitcher?.fullName),
        opponent: asString(oppPitcher?.fullName),
      },
      score: metsScore !== null ? { mets: metsScore, opponent: oppScore } : null,
      result,
      inning: asString(linescore?.currentInningOrdinal),
      scoringPlays,
    };
  },
});
