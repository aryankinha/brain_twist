export const levels = ['easy', 'medium', 'hard'];

export const levelDetails = {
  sudoku: ['More givens', 'Fewer givens', 'Fewest givens'],
  lights: ['3 × 3 board', '4 × 4 board', '5 × 5 board'],
  schulte: ['5 × 5 · target highlighted', '5 × 5 · number colors', '6 × 6 · uniform numbers'],
  sequence: ['2 × 2 · 3-shape start', '3 × 3 · 4-shape start', '4 × 4 · 5-shape start'],
  stroop: ['30-second ink-color sprint'],
};

export function readDifficulty(value) {
  return value === 'medium' || value === 'hard' ? value : 'easy';
}

export function levelKey(game, difficulty) {
  if (game === 'stroop' || (difficulty === 'easy' && (game === 'schulte' || game === 'sequence'))) {
    return game;
  }
  return `${game}-${difficulty}`;
}
