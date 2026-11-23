export function compare(order, a, b) {
  return order === 'asc' ? a - b : b - a;
}

export function gameRanking(users, game, order) {
  return Object.entries(users)
    .filter(([, user]) => Object.hasOwn(user.scores, game))
    .map(([id, user]) => ({ id, name: user.name, ...user.scores[game] }))
    .sort((a, b) => compare(order, a.value, b.value) || a.at - b.at);
}

export function overallRanking(users, games) {
  const categories = Object.keys(games);
  const counts = new Map();
  for (const key of categories) {
    const group = key.split('-')[0];
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  const players = new Map();
  for (const key of categories) {
    const ranking = gameRanking(users, key, games[key].order);
    const weight = 100 / counts.get(key.split('-')[0]);
    for (let first = 0; first < ranking.length;) {
      let end = first + 1;
      while (end < ranking.length && ranking[end].value === ranking[first].value) end++;
      // Midrank credits half of the tied group and all players below it.
      const points = (ranking.length - end + (end - first) / 2) / ranking.length * weight;
      for (let i = first; i < end; i++) {
        const { id, name, value } = ranking[i];
        const player = players.get(id) ?? { id, name, total: 0, scores: {} };
        player.total += points;
        player.scores[key] = { value, points: Math.round(points * 10) / 10 };
        players.set(id, player);
      }
      first = end;
    }
  }
  const rows = [...players.values()]
    .map((player) => ({ ...player, total: Math.round(player.total * 10) / 10 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  let rank = 0;
  return rows.map((player, index) => {
    if (rows[index - 1]?.total !== player.total) rank = index + 1;
    return { ...player, rank };
  });
}
