export const gameLabels = {
  'sudoku-easy': 'Sudoku Easy',
  'sudoku-medium': 'Sudoku Medium',
  'sudoku-hard': 'Sudoku Hard',
  'lights-easy': 'Lights Out Easy',
  'lights-medium': 'Lights Out Medium',
  'lights-hard': 'Lights Out Hard',
  schulte: 'Schulte Easy',
  'schulte-medium': 'Schulte Medium',
  'schulte-hard': 'Schulte Hard',
  stroop: 'Stroop',
  sequence: 'Sequence Memory Easy',
  'sequence-medium': 'Sequence Memory Medium',
  'sequence-hard': 'Sequence Memory Hard',
};

export function formatTime(ms, tenths = false) {
  const seconds = Math.floor(ms / 1000);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return tenths ? `${time}.${Math.floor(ms / 100) % 10}` : time;
}

export function scoreUnit(game) {
  if (game === 'stroop') return 'points';
  if (game.startsWith('sequence')) return 'rounds';
  return game.startsWith('lights-') ? 'moves' : 'time';
}

export function higherScoreWins(game) {
  return game === 'stroop' || game.startsWith('sequence');
}

export function formatScore(game, value) {
  if (value == null) return '—';
  if (scoreUnit(game) !== 'time') return String(value);
  return formatTime(value, game.startsWith('schulte'));
}
