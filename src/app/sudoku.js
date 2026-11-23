import { router, Stack, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useReducer, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSudoku } from 'sudoku-gen';
import Button from '../components/Button';
import Pause from '../components/Pause';
import PlayTimer from '../components/PlayTimer';
import { useFeedback } from '../feedback';
import { usePause } from '../use-pause';
import ResultModal from '../components/ResultModal';
import { gameLabels } from '../format';
import { colors, motion, space, type } from '../theme';

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const rowOf = (index) => Math.floor(index / 9);
const colOf = (index) => index % 9;
const boxOf = (index) => Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);

function newGame(difficulty) {
  const { puzzle, solution } = getSudoku(difficulty);
  const board = Array.from(puzzle, (digit) => digit === '-' ? 0 : Number(digit));
  return {
    board, solution: Array.from(solution, Number), given: board.map(Boolean),
    selected: null, mistakes: 0, startedAt: Date.now(), result: null,
  };
}

function reducer(state, action) {
  if (action.type === 'reset') return action.game;
  if (state.result !== null) return state;
  if (action.type === 'select') return { ...state, selected: action.index };
  const { selected, given, solution } = state;
  if (selected === null || given[selected]) return state;
  const { digit, elapsed } = action;
  const board = state.board.slice();
  board[selected] = digit;
  return {
    ...state, board,
    mistakes: state.mistakes + Number(digit !== 0 && digit !== solution[selected]),
    result: board.every((value, index) => value === solution[index]) ? elapsed : null,
  };
}

function SudokuCell({ index, digit, given, wrong, focused, related, matching, size, select, pulse }) {
  const row = rowOf(index);
  const col = colOf(index);
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${digit || 'blank'}${given ? ', given' : ''}${wrong ? ', incorrect' : ''}`}
      accessibilityState={{ selected: focused }}
      onPress={() => select(index)}
      style={[
        styles.cell, { width: size, height: size },
        row % 3 === 0 && styles.boxTop, col % 3 === 0 && styles.boxLeft,
        row === 8 && styles.boxBottom, col === 8 && styles.boxRight,
        related && styles.related, matching && styles.matching,
        wrong && styles.wrongCell, focused && styles.focused, focused && wrong && styles.focusedWrong,
      ]}>
      <Animated.Text maxFontSizeMultiplier={1.25} style={[styles.digit, given && styles.given, wrong && styles.error, pulse && { transform: [{ scale: pulse }] }]}>{digit || ''}</Animated.Text>
      {wrong && <Text style={styles.errorMark} accessible={false}>×</Text>}
    </Pressable>
  );
}

const Cell = memo(SudokuCell);

export default function SudokuScreen() {
  const { difficulty: requested } = useLocalSearchParams();
  const difficulty = requested === 'medium' || requested === 'hard' ? requested : 'easy';
  const game = `sudoku-${difficulty}`;
  const [state, dispatch] = useReducer(reducer, difficulty, newGame);
  const { board, solution, given, selected, mistakes, startedAt, result } = state;
  const start = useRef(startedAt);
  const { play, animate } = useFeedback();
  const [pulse] = useState(() => new Animated.Value(1));
  const { pausedAt, pause, resume } = usePause(start);
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width, space.maxBoard) - space.xl) / 9);
  const running = result === null;

  function reset() {
    resume();
    const next = newGame(difficulty);
    start.current = next.startedAt;
    dispatch({ type: 'reset', game: next });
  }

  function confirmReset() {
    if (!running) return reset();
    Alert.alert('Start a new game?', 'Your current puzzle will be replaced.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New game', onPress: reset },
    ]);
  }

  const select = useCallback((index) => { pulse.setValue(1); dispatch({ type: 'select', index }); }, [pulse]);
  const enter = useCallback((digit) => {
    if (selected === null || given[selected] || !running || pausedAt !== null) return;
    const mistake = digit !== 0 && digit !== solution[selected];
    play(mistake ? 'wrong' : digit ? 'correct' : 'tap');
    dispatch({ type: 'enter', digit, elapsed: Date.now() - start.current });
    if (animate && !mistake && digit) {
      pulse.setValue(0.84);
      Animated.timing(pulse, { toValue: 1, duration: motion.feedback, useNativeDriver: true }).start();
    }
  }, [animate, given, pausedAt, play, pulse, running, selected, solution]);
  const selectedDigit = selected === null ? 0 : board[selected];
  const filled = board.filter((digit, index) => digit === solution[index]).length;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: gameLabels[game] }} />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.stats, { width: cell * 9 }]}>
          <View><Text style={styles.label}>Time</Text><PlayTimer key={startedAt} start={start} running={running} result={result} pausedAt={pausedAt} style={styles.stat} /></View>
          <View><Text style={styles.label}>Mistakes</Text><Text style={[styles.stat, mistakes > 0 && styles.error]}>{mistakes}</Text></View>
          <Button title="Pause" onPress={pause} disabled={!running} />
        </View>
        <View style={[styles.board, { width: cell * 9 }]}>
          {board.map((digit, index) => (
            <Cell key={index} index={index} digit={digit} given={given[index]} size={cell} select={select}
              focused={index === selected} pulse={index === selected ? pulse : null} wrong={digit !== 0 && digit !== solution[index]}
              matching={digit !== 0 && digit === selectedDigit && digit === solution[index]}
              related={selected !== null && (rowOf(index) === rowOf(selected) || colOf(index) === colOf(selected) || boxOf(index) === boxOf(selected))} />
          ))}
        </View>
        <View style={[styles.pad, { width: cell * 9 }]}>
          {digits.map((digit) => (
            <Button key={digit} title={String(digit)} selected={digit === selectedDigit} labelStyle={styles.keyDigit} onPress={() => enter(digit)} style={styles.key} />
          ))}
          <Button title="Erase" onPress={() => enter(0)} style={styles.key} />
        </View>
        <View style={[styles.footer, { width: cell * 9 }]}>
          <Text style={styles.label}>{filled} / 81 solved</Text>
          <Button title="New game" onPress={confirmReset} />
        </View>
      </ScrollView>
      {pausedAt !== null && <Pause onResume={resume} onRestart={reset} onLeave={() => router.back()} />}
      {result !== null && (
        <ResultModal game={game} value={result} onAgain={reset} onBack={() => router.back()}>
          <Text style={styles.label}>{mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { padding: space.page, alignItems: 'center', gap: space.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.xs },
  stat: { ...type.number, fontSize: 25, color: colors.text },
  label: { ...type.label, color: colors.muted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderTopWidth: space.hairline, borderLeftWidth: space.hairline, borderColor: colors.border },
  boxTop: { borderTopWidth: space.line, borderTopColor: colors.accent },
  boxLeft: { borderLeftWidth: space.line, borderLeftColor: colors.accent },
  boxBottom: { borderBottomWidth: space.line, borderBottomColor: colors.accent },
  boxRight: { borderRightWidth: space.line, borderRightColor: colors.accent },
  related: { backgroundColor: colors.tint },
  matching: { backgroundColor: colors.selected },
  wrongCell: { backgroundColor: colors.errorFill },
  focused: { backgroundColor: colors.selected, borderWidth: space.line, borderColor: colors.accent },
  focusedWrong: { borderColor: colors.error, backgroundColor: colors.errorFill },
  errorMark: { position: 'absolute', right: 2, top: 0, color: colors.error, fontSize: 11 },
  digit: { color: colors.accent, fontSize: 20 },
  given: { color: colors.text, fontWeight: '700' },
  error: { color: colors.error },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  keyDigit: { ...type.number, fontSize: 20 },
  key: { width: '19%', paddingHorizontal: space.xs },
});
