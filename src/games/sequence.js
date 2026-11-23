export const initialSequence = { pattern: [], phase: 'ready', score: 0, step: 0, cue: null, miss: null };

export const sequenceLevels = {
  easy: { size: 2, opening: 3, flash: 590 },
  medium: { size: 3, opening: 4, flash: 530 },
  hard: { size: 4, opening: 5, flash: 470 },
};

export function nextTile(previous, count, random = Math.random) {
  const index = Math.floor(random() * (previous == null ? count : count - 1));
  return previous != null && index >= previous ? index + 1 : index;
}

export function flashDuration(score, base) {
  return Math.max(280, base - score * 26);
}

export function sequenceReducer(state, action) {
  if (action.type === 'start') {
    return { ...initialSequence, pattern: action.pattern, phase: 'watch' };
  }
  if (action.type === 'resume-preview' && state.phase === 'watch') {
    return { ...state, step: 0, cue: null };
  }
  if (action.type === 'tick' && state.phase === 'watch') {
    if (state.cue !== null) return { ...state, cue: null, step: state.step + 1 };
    if (state.step === state.pattern.length) return { ...state, phase: 'input', step: 0 };
    return { ...state, cue: state.pattern[state.step] };
  }
  if (action.type === 'press' && state.phase === 'input') {
    if (action.tile !== state.pattern[state.step]) {
      return { ...state, phase: 'over', miss: action.tile };
    }
    const step = state.step + 1;
    return step === state.pattern.length
      ? { ...state, score: state.score + 1, phase: 'clear', step }
      : { ...state, step };
  }
  if (action.type === 'advance' && state.phase === 'clear') {
    return { ...state, pattern: [...state.pattern, action.tile], phase: 'watch', step: 0 };
  }
  return state;
}
