export const levels = ['easy', 'medium', 'hard'];

export const levelDetails = {
  sudoku: ['More givens', 'Fewer givens', 'Fewest givens'],
  lights: ['3 × 3 board', '4 × 4 board', '5 × 5 board'],
  schulte: ['5 × 5 · color groups', '5 × 5 · uniform numbers', '6 × 6 · uniform numbers'],
  sequence: ['3 cues · Ghost and Echo bosses', '4 cues · Reverse and Shuffle bosses', '5 cues · Decoy and Timed bosses'],
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
