import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('API accepts local web scores and updates both rankings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'brain-twist-check-'));
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const server = spawn(process.execPath, ['index.js'], {
    cwd: import.meta.dirname,
    env: { ...process.env, DATA_DIR: dir, PORT: String(port), WEB_ORIGINS: '' },
    stdio: 'inherit',
  });
  const exited = once(server, 'exit');
  const base = `http://127.0.0.1:${port}`;
  const origin = 'http://localhost:8081';
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      const ready = await new Promise((resolve) => {
        get(base + '/health', (response) => {
          response.resume();
          resolve(response.statusCode === 200);
        }).on('error', () => resolve(false));
      });
      if (ready) break;
      if (attempt === 59 || server.exitCode !== null) throw new Error('API failed to start');
      await delay(50);
    }
    const health = await fetch(base + '/health');
    assert.deepEqual(await health.json(), { ok: true });
    const preflight = await fetch(base + '/scores', {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    const unknown = await fetch(base + '/health', { headers: { Origin: 'https://unlisted.example' } });
    assert.equal(unknown.headers.get('access-control-allow-origin'), null);
    const score = await fetch(base + '/scores?rankings=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ userId: 'ci-player', name: 'CI Player', game: 'sequence', value: 4 }),
    });
    assert.equal(score.status, 200);
    assert.equal(score.headers.get('access-control-allow-origin'), origin);
    assert.equal((await score.json()).overallRank, 1);
    const game = await fetch(base + '/leaderboard/sequence?userId=ci-player');
    assert.deepEqual((await game.json()).entries, [{ rank: 1, name: 'CI Player', value: 4, isYou: true }]);
    const overall = await fetch(base + '/leaderboard/overall?userId=ci-player');
    const { entries } = await overall.json();
    assert.equal(entries[0].scores.sequence.value, 4);
    assert.equal(entries[0].isYou, true);
    assert.equal(Object.hasOwn(entries[0], 'id'), false);
  } finally {
    server.kill();
    await exited;
    await rm(dir, { recursive: true, force: true });
  }
});
