import { defineTool } from 'eve/tools';
import { z } from 'zod';

// New York Mets team id in the MLB Stats API.
const METS_ID = 121;
const API = 'https://statsapi.mlb.com/api/v1/schedule';

// Today's date in America/New_York as YYYY-MM-DD, so "today's game" means the
// fan's today, not UTC's.
function easternDate(): string {
  // en-CA gives YYYY-MM-DD formatting.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function easternTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default defineTool({
  description:
    "Get the New York Mets game for a date (defaults to today, Eastern time). Returns matchup, first pitch, status, probable pitchers, and — if the game is final or in progress — the score and result from the Mets' point of view.",
  inputSchema: z.object({
    date: z
      .string()
      .optional()
      .describe('YYYY-MM-DD. Omit for today (America/New_York).'),
  }),
  async execute({ date }) {
    const day = date ?? easternDate();
    const url =
      `${API}?sportId=1&teamId=${METS_ID}&date=${day}` +
      `&hydrate=probablePitcher,linescore,team`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'mets-game-day-agent' },
    });
    if (!res.ok) {
      return { ok: false, error: `MLB API ${res.status}`, date: day };
    }

    const data = (await res.json()) as any;
    const games: any[] = data?.dates?.[0]?.games ?? [];
    if (games.length === 0) {
      return { ok: true, hasGame: false, date: day };
    }

    // Doubleheaders are rare; take the first unfinished game, else the last one.
    const game =
      games.find((g) => g?.status?.abstractGameState !== 'Final') ??
      games[games.length - 1];

    const home = game.teams.home;
    const away = game.teams.away;
    const metsAreHome = home.team.id === METS_ID;
    const mets = metsAreHome ? home : away;
    const opp = metsAreHome ? away : home;

    const status: string = game.status?.detailedState ?? 'Unknown';
    const isFinal = game.status?.abstractGameState === 'Final';
    const isLive = game.status?.abstractGameState === 'Live';

    let result: 'win' | 'loss' | 'tie' | null = null;
    if (isFinal && typeof mets.score === 'number' && typeof opp.score === 'number') {
      result = mets.score > opp.score ? 'win' : mets.score < opp.score ? 'loss' : 'tie';
    }

    return {
      ok: true,
      hasGame: true,
      date: day,
      status, // e.g. "Scheduled", "Pre-Game", "In Progress", "Final", "Postponed"
      isFinal,
      isLive,
      metsHomeOrAway: metsAreHome ? 'home' : 'away',
      opponent: opp.team.name,
      firstPitchET: game.gameDate ? easternTime(game.gameDate) : null,
      probablePitchers: {
        mets: mets.probablePitcher?.fullName ?? null,
        opponent: opp.probablePitcher?.fullName ?? null,
      },
      score:
        typeof mets.score === 'number'
          ? { mets: mets.score, opponent: opp.score }
          : null,
      result, // null until the game is final
      inning: game.linescore?.currentInningOrdinal ?? null, // e.g. "7th" while live
    };
  },
});
