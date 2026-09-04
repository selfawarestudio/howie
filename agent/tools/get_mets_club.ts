import { defineTool } from 'eve/tools';
import { z } from 'zod';

import {
  METS_ID,
  NL_LEAGUE_ID,
  asNumber,
  asRecord,
  asString,
  easternDate,
} from '../lib/mlb.js';

export default defineTool({
  description:
    'Get current Mets club context: season record, last ten, streak, NL East place, wild-card gap, and recent transactions. Use this for zeitgeist, not the box score.',
  inputSchema: z.object({}),
  async execute() {
    const today = easternDate(0);
    const twoWeeksAgo = easternDate(-14);
    const season = today.slice(0, 4);

    const [standingsRes, txRes] = await Promise.all([
      fetch(
        `https://statsapi.mlb.com/api/v1/standings?leagueId=${NL_LEAGUE_ID}&season=${season}&standingsTypes=regularSeason`,
        { headers: { 'User-Agent': 'mets-game-day-agent' } },
      ),
      fetch(
        `https://statsapi.mlb.com/api/v1/transactions?teamId=${METS_ID}&startDate=${twoWeeksAgo}&endDate=${today}`,
        { headers: { 'User-Agent': 'mets-game-day-agent' } },
      ),
    ]);

    if (!standingsRes.ok) {
      return { ok: false as const, error: `MLB standings ${standingsRes.status}` };
    }

    const standingsJson: unknown = await standingsRes.json();
    const standingsRoot = asRecord(standingsJson);
    const records = Array.isArray(standingsRoot?.records) ? standingsRoot.records : [];

    let club: Record<string, unknown> | null = null;
    for (const division of records) {
      const divisionRecord = asRecord(division);
      const teamRecords = Array.isArray(divisionRecord?.teamRecords)
        ? divisionRecord.teamRecords
        : [];
      for (const teamRecord of teamRecords) {
        const row = asRecord(teamRecord);
        const team = asRecord(row?.team);
        if (asNumber(team?.id) === METS_ID) {
          club = row;
          break;
        }
      }
      if (club) break;
    }

    if (!club) {
      return { ok: false as const, error: 'Mets standings row missing' };
    }

    const leagueRecord = asRecord(club.leagueRecord);
    const streak = asRecord(club.streak);
    const splitRecords = asRecord(club.records);
    const splits = Array.isArray(splitRecords?.splitRecords) ? splitRecords.splitRecords : [];
    const lastTenRow = splits
      .map((entry) => asRecord(entry))
      .find((entry) => asString(entry?.type) === 'lastTen');

    let transactions: { date: string | null; type: string | null; description: string }[] = [];
    if (txRes.ok) {
      const txJson: unknown = await txRes.json();
      const txRoot = asRecord(txJson);
      const rows = Array.isArray(txRoot?.transactions) ? txRoot.transactions : [];
      transactions = rows
        .map((entry) => asRecord(entry))
        .filter((entry) => entry !== null)
        .map((entry) => ({
          date: asString(entry.date),
          type: asString(entry.typeDesc),
          description: asString(entry.description) ?? '',
        }))
        .filter((entry) => entry.description.length > 0)
        .slice(-8)
        .reverse();
    }

    return {
      ok: true as const,
      asOf: today,
      record: {
        wins: asNumber(leagueRecord?.wins),
        losses: asNumber(leagueRecord?.losses),
        pct: asString(leagueRecord?.pct),
      },
      lastTen: {
        wins: asNumber(lastTenRow?.wins),
        losses: asNumber(lastTenRow?.losses),
      },
      streak: asString(streak?.streakCode),
      divisionRank: asString(club.divisionRank),
      leagueRank: asString(club.leagueRank),
      gamesBack: asString(club.gamesBack),
      wildCardGamesBack: asString(club.wildCardGamesBack),
      recentTransactions: transactions,
    };
  },
});
