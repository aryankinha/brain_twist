import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import GameBrief from '../components/GameBrief';
import ArcadeArt from '../components/ArcadeArt';
import Pause from '../components/Pause';
import PlayTimer from '../components/PlayTimer';
import { useFeedback } from '../feedback';
import { getBest } from '../storage';
import { levelKey, readDifficulty } from '../difficulty';
import { schulteLevels, shuffleNumbers } from '../games/schulte';
import { formatTime, gameLabels } from '../format';
import { usePause } from '../use-pause';
import ResultModal from '../components/ResultModal';
import { colors, motion, space, type } from '../theme';

const groupInks = [colors.violetInk, colors.skyInk, colors.amberInk, colors.accent, colors.peachInk];

export default function SchulteScreen() {
  const { difficulty: requested } = useLocalSearchParams();
  const difficulty = readDifficulty(requested);
  const game = levelKey('schulte', difficulty);
  const { size, cue } = schulteLevels[difficulty];
  const total = size * size;
  const start = useRef(0);
  const next = useRef(1);
  const [numbers, setNumbers] = useState([]);
  const [target, setTarget] = useState(1);
  const [wrong, setWrong] = useState(null);
  const [best, setBest] = useState(null);
  const { play, animate } = useFeedback();
  const { pausedAt, pause, resume } = usePause(start);
  const [result, setResult] = useState(null);
  const [translateX] = useState(() => new Animated.Value(0));
  const running = numbers.length > 0 && result === null;

  useEffect(() => { getBest(game).then(setBest).catch(() => {}); }, [game, result]);
  useEffect(() => { if (!animate) translateX.setValue(0); }, [animate, translateX]);
  useEffect(() => () => translateX.stopAnimation(), [translateX]);

  function begin() {
    resume();
    const shuffled = shuffleNumbers(size);
    start.current = Date.now();
    next.current = 1;
    translateX.setValue(0);
    setTarget(1);
    setWrong(null);
    setResult(null);
    setNumbers(shuffled);
  }

  const tap = useCallback((number) => {
    const expected = next.current;
    if (pausedAt !== null || number < expected || expected > total) return;
    if (number !== expected) {
      setWrong(number);
      play('wrong');
      if (!animate) return;
      translateX.setValue(0);
      Animated.sequence([-space.shake, space.shake, 0].map((toValue) =>
        Animated.timing(translateX, { toValue, duration: motion.shake, useNativeDriver: true }),
      )).start();
      return;
    }
    setWrong(null);
    next.current += 1;
    if (number < total) play('tap');
    setTarget(next.current);
    if (number === total) setResult(Date.now() - start.current);
  }, [animate, pausedAt, play, total, translateX]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: gameLabels[game] }} />
      <ScrollView contentContainerStyle={styles.page}>
        {numbers.length === 0 ? (
          <GameBrief kicker={`${difficulty} · Visual search`} title={`Find 01–${total}`} tone={colors.lime}
            detail={cue === 'groups' ? 'Tap the numbers in order. Color groups mark every five numbers.' : 'Find every number in order. All numbers look alike.'}
            best={best == null ? '—' : formatTime(best, true)} startLabel="Start" onStart={begin}>
            <ArcadeArt game="schulte" size={188} card highlight={false} />
          </GameBrief>
        ) : (
          <View style={styles.content}>
            <View style={styles.stats}>
              <View><Text style={styles.label}>Find</Text><Text style={styles.target}>{target <= total ? String(target).padStart(2, '0') : '✓'}</Text></View>
              <View><Text style={styles.label}>Time</Text><PlayTimer start={start} running={running} result={result} pausedAt={pausedAt} tenths style={styles.time} /></View>
              <Button title="Pause" onPress={pause} disabled={!running} />
            </View>
            <View style={styles.progress} accessibilityLabel={`${target - 1} of ${total} found`}>
              {Array.from({ length: total }, (_, i) => <View key={i} style={[styles.tick, i < target - 1 && styles.complete]} />)}
            </View>
            <View style={styles.gridCaption}><Text style={styles.label}>{target - 1} / {total} found</Text>{best != null && <Text style={styles.label}>Best {formatTime(best, true)}</Text>}</View>
            <Animated.View style={[styles.grid, { transform: [{ translateX }] }]}>
              {numbers.map((number) => (
                <View key={number} style={[styles.slot, { width: `${100 / size}%` }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${number}${number < target ? ' found' : wrong === number ? ' wrong target' : ''}`}
                    accessibilityState={{ disabled: number < target }}
                    disabled={number < target}
                    onPress={() => tap(number)}
                    style={({ pressed }) => [styles.cell, number < target && styles.found, wrong === number && styles.wrong, pressed && styles.pressed]}
                  >
                    <Text style={[styles.number, cue === 'groups' && { color: groupInks[(Math.ceil(number / 5) - 1) % groupInks.length] }, number < target && styles.foundText]}>{number < target ? '✓' : wrong === number ? `${number} ×` : number}</Text>
                  </Pressable>
                </View>
              ))}
            </Animated.View>
          </View>
        )}
      </ScrollView>
      {pausedAt !== null && <Pause onResume={resume} onRestart={begin} onLeave={() => router.back()} />}
      {result !== null && <ResultModal game={game} value={result} onAgain={begin} onBack={() => router.back()} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, padding: space.page, alignItems: 'center', justifyContent: 'flex-start' },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: space.maxBoard, gap: space.page },
  stats: { backgroundColor: colors.arcadeLime, padding: space.page, borderRadius: space.radius, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...type.label, color: colors.limeInk },
  target: { ...type.display, lineHeight: 54, color: colors.limeInk },
  time: { ...type.number, fontSize: 25, color: colors.limeInk },
  progress: { flexDirection: 'row', gap: 2 },
  tick: { flex: 1, height: 5, backgroundColor: colors.border },
  gridCaption: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  complete: { backgroundColor: colors.limeInk },
  wrong: { backgroundColor: colors.errorFill, borderColor: colors.error },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { aspectRatio: 1, padding: space.line },
  cell: { flex: 1, backgroundColor: colors.paper, borderRadius: space.md, alignItems: 'center', justifyContent: 'center', borderWidth: space.hairline, borderColor: colors.border },
  found: { backgroundColor: colors.correct, borderColor: colors.correct },
  foundText: { color: colors.limeInk },
  number: { color: colors.text, fontSize: 20, fontWeight: '600' },
  pressed: { opacity: 0.5 },
});
