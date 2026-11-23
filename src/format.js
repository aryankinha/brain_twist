export const gameLabels = {
  'sudoku-easy': 'Sudoku Easy',
  'sudoku-medium': 'Sudoku Medium',
  'sudoku-hard': 'Sudoku Hard',
  'lights-easy': 'Lights Out Easy',
  'lights-medium': 'Lights Out Medium',
  'lights-hard': 'Lights Out Hard',
  schulte: 'Schulte',
  stroop: 'Stroop',
};

export function formatTime(ms, tenths = false) {
  const seconds = Math.floor(ms / 1000);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return tenths ? `${time}.${Math.floor(ms / 100) % 10}` : time;
}

export function scoreUnit(game) {
  if (game === 'stroop') return 'points';
  return game.startsWith('lights-') ? 'moves' : 'time';
}

export function formatScore(game, value) {
  if (value == null) return '—';
  if (scoreUnit(game) !== 'time') return String(value);
  return formatTime(value, game === 'schulte');
}
