export function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const rotation = ['schulte', 'sudoku-easy', 'stroop', 'sudoku-medium', 'sudoku-hard'];

export function dailyGame(day) {
  return rotation[Math.floor(Date.parse(day) / 86400000) % rotation.length];
}

export function previousDay(day) {
  return new Date(Date.parse(day) - 86400000).toISOString().slice(0, 10);
}

export function dailyStreak(progress, day) {
  if (progress?.day !== day && progress?.day !== previousDay(day)) return 0;
  return progress.streak ?? 1;
}
