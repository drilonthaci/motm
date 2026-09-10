// Domain rules for the company 5+1 league. Kept free of Firebase so the
// season table and match maths stay testable and cheap to reason about.

export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];

// Mini football: six on the pitch a side, one or two waiting to come on.
export const STARTERS = 6;
export const MAX_BENCH = 2;

// We play blacks against whites. Side A is always black, side B always white.
export const KITS = {
  A: { id: 'black', label: 'Black', fill: '#141414', line: '#3A3A3A', text: '#ffffff' },
  B: { id: 'white', label: 'White', fill: '#F2F2F2', line: '#F2F2F2', text: '#111111' }
};

export const kit = (side) => KITS[side] ?? KITS.A;

/** SofaScore-style rating bands: red under 6, orange to 7, green to 9, blue above. */
export function ratingColor(value) {
  if (value == null) return '#3A3D44';
  if (value >= 9) return '#3A7BD5';
  if (value >= 8) return '#18A05A';
  if (value >= 7) return '#78BE3C';
  if (value >= 6) return '#E2A03C';
  return '#DB4A3D';
}

export const EVENT_TYPES = [
  { id: 'goal', label: 'Goal', glyph: '●' },
  { id: 'own_goal', label: 'Own goal', glyph: '○' },
  { id: 'yellow', label: 'Yellow card', glyph: '▮' },
  { id: 'red', label: 'Red card', glyph: '▮' },
  { id: 'save', label: 'Big save', glyph: '✦' }
];

export const eventType = (id) => EVENT_TYPES.find((t) => t.id === id) ?? EVENT_TYPES[0];

/** The score implied by the logged goals. Events store `team` as the side
 *  the goal is credited to, so own goals already sit with the side that
 *  benefited. */
export function derivedScore(match) {
  let a = 0;
  let b = 0;
  for (const e of match?.events ?? []) {
    if (e.type !== 'goal' && e.type !== 'own_goal') continue;
    if (e.team === 'A') a += 1;
    else b += 1;
  }
  return { a, b };
}

/** You can either let the goal log drive the score, or type it in directly
 *  when nobody remembers who scored. `manualScore` says which is in charge,
 *  so the two can never silently disagree. */
export function scoreOf(match) {
  if (match?.manualScore) {
    return { a: Number(match.scoreA) || 0, b: Number(match.scoreB) || 0 };
  }
  return derivedScore(match);
}

/** True when a typed-in score contradicts the goals actually logged. */
export function scoreConflict(match) {
  if (!match?.manualScore) return null;
  const manual = scoreOf(match);
  const derived = derivedScore(match);
  if (!(match.events ?? []).some((e) => e.type === 'goal' || e.type === 'own_goal')) return null;
  if (manual.a === derived.a && manual.b === derived.b) return null;
  return derived;
}

/** Events sort by minute when there is one; untimed goals keep the order
 *  they were added in and sit at the end. */
export function sortedEvents(match) {
  return [...(match?.events ?? [])].sort(
    (x, y) => (x.minute ?? Infinity) - (y.minute ?? Infinity)
  );
}

export function lineupOf(match, side) {
  return (side === 'A' ? match?.lineupA : match?.lineupB) ?? [];
}

export const startersOf = (match, side) => lineupOf(match, side).filter((s) => !s.bench);
export const benchOf = (match, side) => lineupOf(match, side).filter((s) => s.bench);

export function allSquad(match) {
  return [
    ...lineupOf(match, 'A').map((s) => ({ ...s, team: 'A' })),
    ...lineupOf(match, 'B').map((s) => ({ ...s, team: 'B' }))
  ];
}

export function sideOfPlayer(match, playerId) {
  if (lineupOf(match, 'A').some((s) => s.id === playerId)) return 'A';
  if (lineupOf(match, 'B').some((s) => s.id === playerId)) return 'B';
  return null;
}

/** Average rating per player across every submitted card, plus the count of
 *  people who bothered to rate them. */
export function ratingSummary(cards) {
  const totals = new Map();
  for (const card of cards) {
    for (const [playerId, score] of Object.entries(card.scores ?? {})) {
      const n = Number(score);
      if (!Number.isFinite(n) || n <= 0) continue;
      const row = totals.get(playerId) ?? { sum: 0, count: 0 };
      row.sum += n;
      row.count += 1;
      totals.set(playerId, row);
    }
  }
  const out = {};
  for (const [playerId, row] of totals) {
    out[playerId] = { avg: row.sum / row.count, count: row.count };
  }
  return out;
}

/** Man of the match. One rating is enough to crown someone, so the award
 *  shows up as soon as anybody has rated the game. */
export function manOfTheMatch(summary, minVotes = 1) {
  let best = null;
  for (const [playerId, row] of Object.entries(summary)) {
    if (row.count < minVotes) continue;
    if (!best || row.avg > best.avg || (row.avg === best.avg && row.count > best.count)) {
      best = { playerId, ...row };
    }
  }
  return best;
}

/** The match's MVP. Prefers the denormalised `motmId`, but falls back to
 *  recomputing from the stored rating summary - that field is only rewritten
 *  when somebody submits a card, so it goes stale whenever the rules for
 *  winning change underneath it. */
export function motmOf(match) {
  if (match?.motmId) return match.motmId;
  if (!match?.ratings) return null;
  return manOfTheMatch(match.ratings)?.playerId ?? null;
}

export function isPlayed(match) {
  return Boolean(match?.finished);
}

/** Season table built from played matches only. Appearances count lineups,
 *  goals/assists count events, W/D/L follows the side the player lined up for. */
export function seasonTable(matches, players) {
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) {
      rows.set(id, {
        id,
        name: players.find((p) => p.id === id)?.name ?? 'Unknown',
        position: players.find((p) => p.id === id)?.position ?? '',
        apps: 0, goals: 0, assists: 0, won: 0, drawn: 0, lost: 0,
        motm: 0, ratingSum: 0, ratingCount: 0
      });
    }
    return rows.get(id);
  };

  for (const match of matches) {
    if (!isPlayed(match)) continue;
    const { a, b } = scoreOf(match);

    for (const side of ['A', 'B']) {
      const mine = side === 'A' ? a : b;
      const theirs = side === 'A' ? b : a;
      for (const slot of lineupOf(match, side)) {
        const r = row(slot.id);
        r.apps += 1;
        if (mine > theirs) r.won += 1;
        else if (mine === theirs) r.drawn += 1;
        else r.lost += 1;
      }
    }

    for (const e of match.events ?? []) {
      if (e.type === 'goal' && e.playerId) row(e.playerId).goals += 1;
      if ((e.type === 'goal' || e.type === 'own_goal') && e.assistId) row(e.assistId).assists += 1;
    }

    for (const [playerId, stat] of Object.entries(match.ratings ?? {})) {
      const r = row(playerId);
      r.ratingSum += stat.avg * stat.count;
      r.ratingCount += stat.count;
    }
    const mvp = motmOf(match);
    if (mvp) row(mvp).motm += 1;
  }

  return [...rows.values()]
    .map((r) => ({ ...r, rating: r.ratingCount ? r.ratingSum / r.ratingCount : null }))
    .sort((x, y) =>
      y.goals + y.assists - (x.goals + x.assists) ||
      y.goals - x.goals ||
      y.apps - x.apps ||
      x.name.localeCompare(y.name)
    );
}

/** Top of the charts for one stat, ties broken by the other one. */
export function leaderboard(rows, field, limit = 5) {
  const other = field === 'goals' ? 'assists' : 'goals';
  return rows
    .filter((r) => r[field] > 0)
    .sort((x, y) => y[field] - x[field] || y[other] - x[other] || x.name.localeCompare(y.name))
    .slice(0, limit);
}

export function headToHead(matches) {
  let aWins = 0, bWins = 0, draws = 0, goalsA = 0, goalsB = 0, played = 0;
  for (const match of matches) {
    if (!isPlayed(match)) continue;
    played += 1;
    const { a, b } = scoreOf(match);
    goalsA += a;
    goalsB += b;
    if (a > b) aWins += 1;
    else if (b > a) bWins += 1;
    else draws += 1;
  }
  return { aWins, bWins, draws, goalsA, goalsB, played };
}
