import {
  METS_ID,
  asNumber,
  asRecord,
  asString,
  easternTime,
  resolveGameDate,
} from './mlb.js';

const API = 'https://statsapi.mlb.com/api/v1/schedule';

export type ScoringPlay = {
  inning: number | null;
  half: 'top' | 'bottom' | null;
  event: string | null;
  description: string;
  batter: string | null;
};

export type MetsGame = {
  ok: true;
  hasGame: true;
  date: string;
  gamePk: number;
  status: string;
  abstractGameState: 'Preview' | 'Live' | 'Final' | 'Other';
  isFinal: boolean;
  isLive: boolean;
  metsHomeOrAway: 'home' | 'away';
  opponent: string | null;
  firstPitchAt: string | null;
  firstPitchET: string | null;
  probablePitchers: {
    mets: string | null;
    opponent: string | null;
  };
  score: { mets: number; opponent: number | null } | null;
  result: 'win' | 'loss' | 'tie' | null;
  inning: string | null;
  scoringPlays: ScoringPlay[];
};

export type MetsGameResult =
  | { ok: true; hasGame: false; date: string }
  | MetsGame
  | { ok: false; error: string; date: string };

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

function parseAbstractState(value: string | null): MetsGame['abstractGameState'] {
  if (value === 'Preview' || value === 'Live' || value === 'Final') return value;
  return 'Other';
}

export async function fetchMetsGame(date?: string): Promise<MetsGameResult> {
  const day = resolveGameDate(date);
  const url =
    `${API}?sportId=1&teamId=${METS_ID}&date=${day}` +
    `&hydrate=probablePitcher,linescore,team,scoringplays,decisions`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'mets-game-day-agent' },
  });
  if (!res.ok) {
    return { ok: false, error: `MLB API ${res.status}`, date: day };
  }

  const data: unknown = await res.json();
  const root = asRecord(data);
  const dates = Array.isArray(root?.dates) ? root.dates : [];
  const firstDate = asRecord(dates[0]);
  const games = Array.isArray(firstDate?.games) ? firstDate.games : [];
  if (games.length === 0) {
    return { ok: true, hasGame: false, date: day };
  }

  const parsedGames = games.map((game) => asRecord(game)).filter((game) => game !== null);
  const game =
    parsedGames.find((entry) => {
      const status = asRecord(entry.status);
      return asString(status?.abstractGameState) !== 'Final';
    }) ?? parsedGames[parsedGames.length - 1];

  if (!game) {
    return { ok: true, hasGame: false, date: day };
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
  const abstractStateRaw = asString(status?.abstractGameState);
  const abstractGameState = parseAbstractState(abstractStateRaw);
  const isFinal = abstractGameState === 'Final';
  const isLive = abstractGameState === 'Live';
  const metsScore = asNumber(mets?.score);
  const oppScore = asNumber(opp?.score);

  let result: 'win' | 'loss' | 'tie' | null = null;
  if (isFinal && metsScore !== null && oppScore !== null) {
    result = metsScore > oppScore ? 'win' : metsScore < oppScore ? 'loss' : 'tie';
  }

  const scoringPlays = Array.isArray(game.scoringPlays)
    ? game.scoringPlays.map(parseScoringPlay).filter((play) => play !== null)
    : [];

  const gameDateIso = asString(game.gameDate);

  return {
    ok: true,
    hasGame: true,
    date: day,
    gamePk: asNumber(game.gamePk) ?? 0,
    status: asString(status?.detailedState) ?? 'Unknown',
    abstractGameState,
    isFinal,
    isLive,
    metsHomeOrAway: metsAreHome ? 'home' : 'away',
    opponent: asString(oppTeam?.name),
    firstPitchAt: gameDateIso,
    firstPitchET: gameDateIso ? easternTime(gameDateIso) : null,
    probablePitchers: {
      mets: asString(metsPitcher?.fullName),
      opponent: asString(oppPitcher?.fullName),
    },
    score: metsScore !== null ? { mets: metsScore, opponent: oppScore } : null,
    result,
    inning: asString(linescore?.currentInningOrdinal),
    scoringPlays,
  };
}
