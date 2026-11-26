import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLeaderboard, getLeaderboardRevision } from './api';

const freshFor = 5 * 60_000;
const retryAfter = 30_000;
const snapshots = new Map();
const inFlight = new Map();
const failedAt = new Map();

function storageKey(game, userId, period) {
  return `leaderboard-v1:${userId}:${game}:${period}`;
}

export async function readStandings(game, userId, period) {
  const key = storageKey(game, userId, period);
  if (snapshots.has(key)) return snapshots.get(key);
  try {
    const saved = JSON.parse(await AsyncStorage.getItem(key));
    if (saved?.data && typeof saved.at === 'number') {
      if (!snapshots.has(key)) snapshots.set(key, saved);
      return snapshots.get(key);
    }
  } catch {
    // A missing or unreadable cache must not prevent remote standings from loading.
  }
  return snapshots.get(key) ?? null;
}

export function refreshStandings(game, userId, period, saved, force = false) {
  const key = storageKey(game, userId, period);
  if (inFlight.has(key)) return inFlight.get(key);
  async function update() {
    const revision = await getLeaderboardRevision();
    const now = Date.now();
    const latest = snapshots.get(key) ?? saved;
    if (!force && latest && latest.revision === revision && now - latest.at < freshFor
      && (latest.data.endsAt == null || latest.data.endsAt > now)) return latest;

    const failure = failedAt.get(key);
    if (!force && failure?.until > now) throw failure.error;
    try {
      const data = await getLeaderboard(game, userId, period);
      if (!Array.isArray(data.entries) || typeof data.ranked !== 'number') {
        throw new Error('Period rankings are unavailable');
      }
      const next = { data, at: Date.now(), revision };
      snapshots.set(key, next);
      failedAt.delete(key);
      await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    } catch (error) {
      failedAt.set(key, { error, until: Date.now() + retryAfter });
      throw error;
    }
  }
  const request = update().finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export async function preloadStandings(userId) {
  const saved = await readStandings('overall', userId, 'week');
  return refreshStandings('overall', userId, 'week', saved);
}
