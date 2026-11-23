export function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const rotation = ['schulte', 'sudoku-easy', 'stroop', 'sudoku-medium', 'sudoku-hard'];

export function dailyGame(day) {
  return rotation[Math.floor(Date.parse(day) / 86400000) % rotation.length];
}
