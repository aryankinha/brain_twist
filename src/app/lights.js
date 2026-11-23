import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Pause from '../components/Pause';
import PlayTimer from '../components/PlayTimer';
import ResultModal from '../components/ResultModal';
import GameBrief from '../components/GameBrief';
import ArcadeArt from '../components/ArcadeArt';
import { getBest } from '../storage';
import { useFeedback } from '../feedback';
import { readDifficulty } from '../difficulty';
import { formatTime, gameLabels } from '../format';
import { levels, lightsReducer, newLights } from '../games/lights';
import { colors, motion, space, type } from '../theme';
import { useGamePulse } from '../use-game-pulse';
import { usePause } from '../use-pause';

export default function LightsScreen() {
  const { difficulty: requested } = useLocalSearchParams();
  const difficulty = readDifficulty(requested);
  const game = `lights-${difficulty}`;
  const [best, setBest] = useState(null);
  useEffect(() => { getBest(game).then(setBest).catch(() => {}); }, [game]);
  const [round, dispatch] = useReducer(lightsReducer, null);
  const { bump, pulse } = useGamePulse();
  const [lastTap, setLastTap] = useState(null);
  const [roundId, setRoundId] = useState(0);
  const start = useRef(0);
  const { pausedAt, pause, resume } = usePause(start);
  const { play, animate } = useFeedback();
  const { width } = useWindowDimensions();
  const { size } = levels[difficulty];
  const side = Math.min(width - space.xl, space.maxBoard);
  const cell = Math.floor((side - (size - 1) * space.sm) / size);
  const finished = round && round.elapsed !== null;
  const lit = round?.board.filter(Boolean).length ?? 0;

  function begin() {
    const board = newLights(difficulty);
    resume();
    start.current = Date.now();
    setLastTap(null);
    setRoundId((id) => id + 1);
    dispatch({ type: 'start', board });
  }

  const press = useCallback((index) => {
    if (pausedAt !== null || finished) return;
    setLastTap(index);
    bump();
    play('tap');
    dispatch({ type: 'press', size, index, elapsed: Date.now() - start.current });
  }, [bump, finished, pausedAt, play, size]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: gameLabels[game] }} />
      <ScrollView contentContainerStyle={styles.page}>
        {!round ? (
          <GameBrief kicker={`${difficulty} · ${size} × ${size}`} title="Switch off every light" tone={colors.amber}
            detail="Tap a tile to flip it and its neighbors above, below, left, and right. Use as few moves as you can."
            best={best == null ? '—' : `${best} moves`} startLabel="Start puzzle" onStart={begin}>
            <ArcadeArt game="lights" size={188} card />
          </GameBrief>
        ) : (
          <View style={[styles.play, { width: cell * size + (size - 1) * space.sm }]}>
            <View style={styles.hud}>
              <View><Text style={styles.label}>Moves</Text><Text style={styles.metric}>{round.moves}</Text></View>
              <View><Text style={styles.label}>Time</Text><PlayTimer key={roundId} start={start} running={!finished} pausedAt={pausedAt} result={round.elapsed} style={styles.metric} /></View>
              <Button title="Pause" onPress={pause} disabled={finished} />
            </View>
            <View style={styles.progress} accessible accessibilityLabel={`${lit} lights on`}>
              <View style={[styles.progressFill, { width: `${lit / (size * size) * 100}%` }]} />
            </View>
            <View style={styles.grid}>
              {round.board.map((on, index) => (
                <Pressable key={index} accessibilityRole="button"
                  accessibilityLabel={`Light row ${Math.floor(index / size) + 1}, column ${index % size + 1}, ${on ? 'on' : 'off'}`}
                  accessibilityState={{ selected: on }} onPress={() => press(index)}
                  style={({ pressed }) => [styles.tile, { width: cell, height: cell }, on && styles.on, pressed && styles.pressed, pressed && animate && styles.compress]}>
                  <Animated.View style={[styles.dot, on && styles.dotOn, lastTap === index && { transform: [{ scale: pulse }] }]} />
                </Pressable>
              ))}
            </View>
            <View style={styles.footer}>
              <Text style={styles.caption}>{lit} lights on</Text><Text style={styles.caption}>{size} × {size} board</Text>
            </View>
          </View>
        )}
      </ScrollView>
      {pausedAt !== null && <Pause onResume={resume} onRestart={begin} onLeave={() => router.back()} />}
      {finished && (
        <ResultModal game={game} value={round.moves} onAgain={begin} onBack={() => router.back()}>
          <Text style={styles.body}>Time  {formatTime(round.elapsed, true)}</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', padding: space.page },
  body: { color: colors.muted, lineHeight: 22, fontSize: 15 },
  play: { flexGrow: 1, justifyContent: 'center', gap: space.md },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  label: { ...type.label, color: colors.muted },
  metric: { ...type.number, fontSize: 26, color: colors.text },
  progress: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.amber },
  progressFill: { height: '100%', backgroundColor: colors.amberInk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: space.hairline, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.arcadeAmber, borderColor: colors.amberInk },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: space.line, borderColor: colors.muted },
  dotOn: { backgroundColor: colors.amberInk, borderColor: colors.amberInk },
  pressed: { opacity: 0.7 },
  compress: { transform: [{ scale: motion.press }] },
  footer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.amber, borderRadius: space.radius, padding: space.md },
  caption: { color: colors.amberInk, fontWeight: '800' },
});
