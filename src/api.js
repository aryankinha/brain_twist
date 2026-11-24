const baseUrl = (process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://brain-twist.onrender.com').replace(/\/+$/, '');

async function request(path, options, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 30_000);
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  try {
    const response = await fetch(baseUrl + path, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export const ping = () => request('/health');

let leaderboardRevision = 0;
export const getLeaderboardRevision = () => leaderboardRevision;

export async function submitScore(score) {
  const result = await request('/scores?rankings=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(score),
  });
  leaderboardRevision += 1;
  return result;
}

export function getLeaderboard(game, userId, period, signal) {
  return request(`/leaderboard/${game}?userId=${encodeURIComponent(userId)}&period=${period}`, {}, signal);
}

export const getPlayer = (key, signal) => request(`/players/${key}`, {}, signal);
