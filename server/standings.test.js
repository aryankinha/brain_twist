import assert from 'node:assert/strict';
import test from 'node:test';
import { standings, playerProfile, utcDay } from './standings.js';

const games = { 'sudoku-easy': { order: 'asc' }, 'sudoku-hard': { order: 'asc' }, sequence: { order: 'desc' } };
const now = Date.parse('2026-11-24T15:00:00Z');
const record = (value, day) => ({ value, at: Date.parse(`2026-11-${day}T12:00:00Z`) });
const aliceToday = record(14000, 24);
const alicePrevious = record(15500, 23);
const aliceLifetime = record(11000, 17);
const bobToday = record(16000, 24);
const bobPrevious = record(13000, 23);
const users = {
  'alice-private': {
    name: 'Alice',
    avatarId: 'nova',
    scores: { 'sudoku-easy': aliceLifetime },
    days: { [utcDay(now)]: { 'sudoku-easy': aliceToday }, [utcDay(now) - 1]: { 'sudoku-easy': alicePrevious } },
  },
  'bob-private': {
    name: 'Bob',
    scores: { 'sudoku-easy': bobPrevious, sequence: record(6, 18) },
    days: { [utcDay(now)]: { 'sudoku-easy': bobToday } },
  },
};

test('period filters separate daily and lifetime bests and compare earlier ranks', () => {
  const daily = standings(users, games, 'sudoku-easy', 'day', 'alice-private', now);
  assert.deepEqual(daily.entries.map(({ name, value, movement }) => [name, value, movement]),
    [['Alice', 14000, 1], ['Bob', 16000, -1]]);
  assert.equal(daily.you.rank, 1);
  assert.equal(new Date(daily.endsAt).toISOString(), '2026-11-25T00:00:00.000Z');
  const weekly = standings(users, games, 'sudoku-easy', 'week', 'alice-private', now);
  assert.equal(weekly.you.value, 14000);
  assert.equal(weekly.you.movement, -1);
  assert.equal(new Date(weekly.endsAt).toISOString(), '2026-11-30T00:00:00.000Z');
  const lifetime = standings(users, games, 'sudoku-easy', 'all', 'alice-private', now);
  assert.equal(lifetime.you.value, 11000);
  assert.equal(lifetime.you.movement, 0);
  assert.equal(lifetime.endsAt, null);
});

test('overall preserves equal game weights and does not expose submission identity', () => {
  const board = standings(users, games, 'overall', 'all', 'alice-private', now);
  assert.deepEqual(board.entries.map(({ name, total }) => [name, total]), [['Bob', 62.5], ['Alice', 37.5]]);
  assert.equal(JSON.stringify(board).includes('alice-private'), false);
  const profile = playerProfile(users, games, board.you.key);
  assert.equal(profile.avatarId, 'nova');
  assert.equal(profile.activeDays, 3);
  assert.deepEqual(profile.history.map((entry) => entry.scores['sudoku-easy'].value), [14000, 15500, 11000]);
  assert.equal(profile.scores['sudoku-easy'].value, 11000);
});

test('a player outside the visible top fifty still gets their own rank', () => {
  const players = Object.fromEntries(Array.from({ length: 52 }, (_, index) =>
    [`player-${index}`, { name: `Player ${index}`, scores: { sequence: record(52 - index, 24) } }]));
  const board = standings(players, games, 'sequence', 'day', 'player-51', now);
  assert.equal(board.entries.length, 50);
  assert.equal(board.you.rank, 52);
  assert.equal(board.you.movement, null);
  assert.equal(board.ranked, 52);
});
