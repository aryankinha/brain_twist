import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export async function openStore(dir) {
  const file = join(dir, 'data.json');
  const temp = join(dir, 'data.tmp');
  let users = {};
  let lastAt = 0;
  let queue = Promise.resolve();

  async function write(nextUsers) {
    await writeFile(temp, JSON.stringify({ users: nextUsers }));
    await rename(temp, file);
  }

  await mkdir(dir, { recursive: true });
  const contents = await readFile(file, 'utf8').catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (contents === null) {
    await write(users);
  } else {
    try {
      const data = JSON.parse(contents);
      if (!isRecord(data?.users)) throw new Error('Invalid users');
      for (const user of Object.values(data.users)) {
        if (!isRecord(user) || typeof user.name !== 'string' || !isRecord(user.scores)) {
          throw new Error('Invalid user');
        }
        for (const score of Object.values(user.scores)) {
          if (!isRecord(score) || !Number.isInteger(score.value) || !Number.isSafeInteger(score.at)) {
            throw new Error('Invalid score');
          }
          lastAt = Math.max(lastAt, score.at);
        }
      }
      users = data.users;
    } catch {
      await rename(file, join(dir, `data.corrupt-${Date.now()}.json`));
      lastAt = 0;
      await write(users);
    }
  }

  return {
    users: () => users,
    update(change) {
      const pending = queue.then(async () => {
        // Keep ties in submission order even when writes share a millisecond.
        const at = Math.max(Date.now(), lastAt + 1);
        const next = change(users, at);
        await write(next.users);
        users = next.users;
        lastAt = at;
        return next.result;
      });
      queue = pending.catch(() => {});
      return pending;
    },
  };
}
