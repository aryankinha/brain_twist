export const sequenceLevels = {
  easy: { opening: 3, flash: 600, floor: 260, bosses: ['ghost', 'echo'] },
  medium: { opening: 4, flash: 530, floor: 230, bosses: ['reverse', 'shuffle'] },
  hard: { opening: 5, flash: 460, floor: 200, bosses: ['decoy', 'timed'] },
};

export function roundRules(difficulty, round) {
  const { opening, flash, floor, bosses } = sequenceLevels[difficulty];
  const boss = round % 5 === 0;
  const twist = boss ? bosses[(round / 5 - 1) % bosses.length] : null;
  return {
    size: round > 8 ? 3 : 2,
    length: opening + round - 1,
    flash: Math.max(boss ? floor - 40 : floor, flash - 30 * Math.floor((round - 1) / 3) - (boss ? 90 : 0)),
    gap: boss ? 100 : 150,
    twist,
    tapTime: twist === 'timed' ? Math.max(650, 1700 - 30 * (round - 1)) : null,
  };
}

export function nextTile(previous, count, random = Math.random) {
  const index = Math.floor(random() * (previous == null ? count : count - 1));
  return previous != null && index >= previous ? index + 1 : index;
}

const openingBoard = [0, 1, 2, 3];
const fullBoard = [0, 1, 4, 2, 3, 5, 6, 7, 8];
export const initialSequence = {
  phase: 'ready', number: 1, cleared: 0, points: 0, combo: 0, lives: 3, retried: false,
  board: openingBoard, pattern: [], plan: [], preview: [], cursor: 0, cue: null,
  step: 0, end: 0, lastHit: null, miss: null,
};

export function multiplier(combo) {
  return Math.min(5, Math.max(1, combo));
}

function shuffle(board, random) {
  const order = [...board];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.every((tile, index) => tile === board[index]) ? [...order.slice(1), order[0]] : order;
}

export function buildRound(difficulty, number, previous, random = Math.random) {
  const rules = roundRules(difficulty, number);
  const pattern = previous ? [...previous.pattern] : [];
  const growing = rules.size === 3 && previous?.board.length === 4;
  if (growing) pattern.push(4 + Math.floor(random() * 5));
  while (pattern.length < rules.length) pattern.push(nextTile(pattern.at(-1), rules.size ** 2, random));
  const board = growing ? fullBoard : previous?.board ?? openingBoard;
  const plan = pattern.map((tile) => ({ tile, fake: false }));
  if (rules.twist === 'decoy') {
    const at = Math.floor(plan.length / 2);
    plan.splice(at, 0, { tile: nextTile(pattern[at], board.length, random), fake: true });
  }
  return { number, rules, pattern, plan, board: rules.twist === 'shuffle' ? shuffle(board, random) : board };
}

function previewRound(state) {
  const end = state.rules.twist === 'echo' ? Math.ceil(state.pattern.length / 2) : state.pattern.length;
  return { ...state, phase: 'watch', preview: state.plan.slice(0, state.rules.twist === 'echo' ? end : undefined),
    cursor: 0, cue: null, step: 0, end, lastHit: null, miss: null };
}

export function expectedTile(state) {
  return state.pattern[state.rules.twist === 'reverse' ? state.pattern.length - 1 - state.step : state.step];
}

export function sequenceReducer(state, action) {
  switch (action.type) {
    case 'round':
      return previewRound({ ...(action.round.number === 1 ? initialSequence : state), ...action.round, retried: false });
    case 'resume':
      return state.phase === 'watch' ? { ...state, cursor: 0, cue: null } : state;
    case 'retry':
      return state.phase === 'miss' ? (state.lives ? previewRound(state) : { ...state, phase: 'over' }) : state;
    case 'tick':
      if (state.phase !== 'watch') return state;
      if (state.cue) return { ...state, cue: null, cursor: state.cursor + 1 };
      if (state.cursor === state.preview.length) return { ...state, phase: 'input' };
      return { ...state, cue: state.preview[state.cursor] };
    case 'press':
    case 'timeout': {
      if (state.phase !== 'input') return state;
      if (action.type === 'timeout' && (action.step !== state.step || action.number !== state.number)) return state;
      const expected = expectedTile(state);
      if (action.type === 'timeout' || action.tile !== expected) {
        const lives = state.lives - 1;
        return { ...state, phase: 'miss', lives, combo: 0, retried: true, lastHit: null,
          miss: action.type === 'timeout' ? expected : action.tile, timedOut: action.type === 'timeout' };
      }
      const step = state.step + 1;
      if (step === state.pattern.length) {
        const combo = state.retried ? 0 : state.combo + 1;
        return { ...state, phase: 'clear', step, lastHit: action.tile, cleared: state.number, combo,
          points: state.points + state.pattern.length * 10 * multiplier(combo) };
      }
      if (step === state.end) {
        return { ...state, phase: 'watch', cursor: 0, cue: null, step, end: state.pattern.length,
          preview: state.plan.slice(step), lastHit: null };
      }
      return { ...state, step, lastHit: action.tile };
    }
    default:
      return state;
  }
}
