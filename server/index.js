import express from 'express';
import { openStore } from './store.js';

const games = {
  'sudoku-easy': { order: 'asc', min: 1000, max: 10800000 },
  'sudoku-medium': { order: 'asc', min: 1000, max: 10800000 },
  'sudoku-hard': { order: 'asc', min: 1000, max: 10800000 },
  schulte: { order: 'asc', min: 1000, max: 600000 },
  stroop: { order: 'desc', min: 0, max: 200 },
};
const validUserId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
const compare = (order, a, b) => order === 'asc' ? a - b : b - a;

const store = await openStore(process.env.DATA_DIR || './data');
const app = express();
app.use(express.json({ limit: '1kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/scores', async (req, res) => {
  const { userId, name, game, value } = req.body ?? {};
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!validUserId(userId)) return res.status(400).json({ error: 'Invalid userId' });
  if (!trimmedName || trimmedName.length > 20) {
    return res.status(400).json({ error: 'Name must be 1–20 characters' });
  }
  if (typeof game !== 'string' || !Object.hasOwn(games, game)) {
    return res.status(400).json({ error: 'Unknown game' });
  }
  const { order, min, max } = games[game];
  if (!Number.isInteger(value) || value < min || value > max) {
    return res.status(400).json({ error: 'Score out of range' });
  }

  const result = await store.update((users, at) => {
    const scores = Object.hasOwn(users, userId) ? users[userId].scores : {};
    const previous = scores[game];
    const improved = !previous || compare(order, value, previous.value) < 0;
    const nextScores = improved ? { ...scores, [game]: { value, at } } : scores;
    return {
      users: { ...users, [userId]: { name: trimmedName, scores: nextScores } },
      result: { game, best: nextScores[game].value, improved },
    };
  });
  res.json(result);
});

app.get('/leaderboard/:game', (req, res) => {
  const { game } = req.params;
  if (!Object.hasOwn(games, game)) return res.status(404).json({ error: 'Unknown game' });
  const { order } = games[game];
  const entries = Object.entries(store.users())
    .filter(([, user]) => Object.hasOwn(user.scores, game))
    .map(([id, user]) => ({ ...user.scores[game], name: user.name, isYou: id === req.query.userId }))
    .sort((a, b) => compare(order, a.value, b.value) || a.at - b.at)
    .slice(0, 50)
    .map(({ name, value, isYou }, index) => ({ rank: index + 1, name, value, isYou }));
  res.json({ game, order, entries });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status >= 400 && error.status < 500) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  console.error(error);
  res.status(500).json({ error: 'Could not save score' });
});

app.listen(process.env.PORT || 10000, '0.0.0.0');
