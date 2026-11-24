import { createHash } from 'node:crypto';
import { compare, gameRanking, overallRanking } from './rankings.js';

const dayMs = 86_400_000;
export const utcDay = (at) => Math.floor(at / dayMs);
export const publicKey = (id) => createHash('sha256').update(id).digest('hex').slice(0, 24);

function bestInto(scores, key, score, games) {
  if (!Object.hasOwn(games, key)) return;
  const previous = scores[key];
  if (!previous || compare(games[key].order, score.value, previous.value) < 0 ||
    (previous.value === score.value && score.at < previous.at)) scores[key] = score;
}

export function dayRecords(user, games) {
  const days = { ...user.days };
  for (const [key, score] of Object.entries(user.scores)) {
    const day = utcDay(score.at);
    const scores = { ...days[day] };
    bestInto(scores, key, score, games);
    days[day] = scores;
  }
  return days;
}

function sliceUsers(users, games, start, end) {
  return Object.fromEntries(Object.entries(users).map(([id, user]) => {
    const scores = {};
    for (const [day, records] of Object.entries(dayRecords(user, games))) {
      if (+day < start || +day >= end) continue;
      for (const [key, score] of Object.entries(records)) bestInto(scores, key, score, games);
    }
    return [id, { ...user, scores }];
  }));
}

function rank(users, games, game) {
  if (game === 'overall') return overallRanking(users, games);
  return gameRanking(users, game, games[game].order).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function standings(users, games, game, period, userId, at = Date.now()) {
  const day = utcDay(at);
  const week = day - ((day + 3) % 7);
  const start = period === 'day' ? day : week;
  const end = period === 'day' ? day + 1 : week + 7;
  const previousStart = period === 'all' ? -Infinity : period === 'day' ? day - 1 : week - 7;
  const rows = rank(period === 'all' ? users : sliceUsers(users, games, start, end), games, game);
  const previous = new Map(rank(sliceUsers(users, games, previousStart, start), games, game)
    .map(({ id, rank }) => [id, rank]));
  const publicRow = ({ id, at, ...row }) => ({
    ...row, key: publicKey(id), avatarId: users[id].avatarId, isYou: id === userId,
    movement: previous.has(id) ? previous.get(id) - row.rank : null,
  });
  const you = rows.find(({ id }) => id === userId);
  return {
    entries: rows.slice(0, 50).map(publicRow),
    you: you ? publicRow(you) : null,
    ranked: rows.length,
    endsAt: period === 'all' ? null : end * dayMs,
  };
}

export function playerProfile(users, games, key) {
  const match = Object.entries(users).find(([id]) => publicKey(id) === key);
  if (!match) return null;
  const [, user] = match;
  const days = Object.entries(dayRecords(user, games)).sort(([a], [b]) => Number(b) - Number(a));
  return {
    name: user.name, avatarId: user.avatarId,
    scores: Object.fromEntries(Object.entries(user.scores).filter(([game]) => Object.hasOwn(games, game))),
    activeDays: days.length,
    history: days.slice(0, 30).map(([day, scores]) => ({ at: +day * dayMs, scores })),
  };
}
