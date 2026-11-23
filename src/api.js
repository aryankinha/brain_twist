const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

async function request(path, options, signal) {
  if (!baseUrl) throw new Error('API URL is missing');
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

export function submitScore(score) {
  return request('/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(score),
  });
}

export function getLeaderboard(game, userId, signal) {
  return request(`/leaderboard/${game}?userId=${encodeURIComponent(userId)}`, {}, signal);
}
