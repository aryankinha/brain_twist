export const levels = {
  easy: { size: 3, presses: 4 },
  medium: { size: 4, presses: 7 },
  hard: { size: 5, presses: 11 },
};

export function toggleLights(board, size, index) {
  const row = Math.floor(index / size);
  const col = index % size;
  const next = board.slice();
  next[index] = !next[index];
  if (row > 0) next[index - size] = !next[index - size];
  if (row < size - 1) next[index + size] = !next[index + size];
  if (col > 0) next[index - 1] = !next[index - 1];
  if (col < size - 1) next[index + 1] = !next[index + 1];
  return next;
}

export function newLights(difficulty, random = Math.random) {
  const { size, presses } = levels[difficulty];
  const candidates = Array.from({ length: size * size }, (_, index) => index);
  let board = candidates.map(() => false);
  for (let i = 0; i < presses; i++) {
    const next = i + Math.floor(random() * (candidates.length - i));
    [candidates[i], candidates[next]] = [candidates[next], candidates[i]];
    board = toggleLights(board, size, candidates[i]);
  }
  return board.some(Boolean) ? board : toggleLights(board, size, candidates[0]);
}

export function lightsReducer(state, action) {
  if (action.type === 'start') return { board: action.board, moves: 0, elapsed: null };
  if (state.elapsed !== null) return state;
  const board = toggleLights(state.board, action.size, action.index);
  return {
    board, moves: state.moves + 1,
    elapsed: board.some(Boolean) ? null : action.elapsed,
  };
}
