import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Pause from '../components/Pause';
import PlayTimer from '../components/PlayTimer';
import ResultModal from '../components/ResultModal';
import Reveal from '../components/Reveal';
import { useFeedback } from '../feedback';
import { formatTime } from '../format';
import { levels, lightsReducer, newLights } from '../games/lights';
import { colors, motion, space, type } from '../theme';
import { usePause } from '../use-pause';

export default function LightsScreen() {
  const { difficulty: requested } = useLocalSearchParams();
  const [difficulty, setDifficulty] = useState(requested === 'medium' || requested === 'hard' ? requested : 'easy');
  const [round, dispatch] = useReducer(lightsReducer, null);
  const [roundId, setRoundId] = useState(0);
  const start = useRef(0);
  const { pausedAt, pause, resume } = usePause(start);
  const { play, animate } = useFeedback();
  const { width } = useWindowDimensions();
  const { size } = levels[difficulty];
  const side = Math.min(width - space.xl, space.maxBoard);
  const cell = Math.floor((side - (size - 1) * space.sm) / size);
  const finished = round && round.elapsed !== null;

  function begin() {
    const board = newLights(difficulty);
    resume();
    start.current = Date.now();
    setRoundId((id) => id + 1);
    dispatch({ type: 'start', board });
  }

  const press = useCallback((index) => {
    if (pausedAt !== null || finished) return;
    play('tap');
    dispatch({ type: 'press', size, index, elapsed: Date.now() - start.current });
  }, [finished, pausedAt, play, size]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: 'Lights Out' }} />
      <ScrollView contentContainerStyle={styles.page}>
        {!round ? (
          <Reveal style={styles.intro}>
            <View style={styles.preview} accessible={false}>
              {[false, true, false, true, true, true, false, true, false].map((on, index) =>
                <View key={index} style={[styles.previewTile, on && styles.previewOn]} />)}
            </View>
            <Text accessibilityRole="header" style={styles.heading}>Switch off every light</Text>
            <Text style={styles.body}>A tap flips its tile and the four tiles beside it. Use as few moves as you can.</Text>
            <View style={styles.options}>
              {Object.keys(levels).map((level) =>
                <Button key={level} title={level[0].toUpperCase() + level.slice(1)}
                  onPress={() => setDifficulty(level)} selected={level === difficulty} style={styles.option} />)}
            </View>
            <Button primary title="Start puzzle" onPress={begin} />
          </Reveal>
        ) : (
          <View style={[styles.play, { width: cell * size + (size - 1) * space.sm }]}>
            <View style={styles.hud}>
              <View><Text style={styles.label}>Moves</Text><Text style={styles.metric}>{round.moves}</Text></View>
              <View><Text style={styles.label}>Time</Text><PlayTimer key={roundId} start={start} running={!finished} pausedAt={pausedAt} result={round.elapsed} style={styles.metric} /></View>
              <Button title="Pause" onPress={pause} disabled={finished} />
            </View>
            <View style={styles.grid}>
              {round.board.map((on, index) => (
                <Pressable key={index} accessibilityRole="button"
                  accessibilityLabel={`Light row ${Math.floor(index / size) + 1}, column ${index % size + 1}, ${on ? 'on' : 'off'}`}
                  accessibilityState={{ selected: on }} onPress={() => press(index)}
                  style={({ pressed }) => [styles.tile, { width: cell, height: cell }, on && styles.on, pressed && styles.pressed, pressed && animate && styles.compress]}>
                  <View style={[styles.dot, on && styles.dotOn]} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.caption}>{round.board.filter(Boolean).length} lights on  ·  {size} × {size}</Text>
          </View>
        )}
      </ScrollView>
      {pausedAt !== null && <Pause onResume={resume} onRestart={begin} onLeave={() => router.back()} />}
      {finished && (
        <ResultModal game={`lights-${difficulty}`} value={round.moves} onAgain={begin} onBack={() => router.back()}>
          <Text style={styles.body}>Time  {formatTime(round.elapsed, true)}</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.page },
  intro: { width: '100%', maxWidth: space.maxBoard, gap: space.page },
  heading: { ...type.heading, color: colors.text },
  body: { color: colors.muted, lineHeight: 22, fontSize: 15 },
  preview: { width: 120, padding: 12, gap: 6, borderRadius: space.card, backgroundColor: colors.amber, flexDirection: 'row', flexWrap: 'wrap' },
  previewTile: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.paper },
  previewOn: { backgroundColor: colors.amberInk },
  options: { flexDirection: 'row', gap: space.sm },
  option: { flex: 1, paddingHorizontal: space.xs },
  play: { gap: space.md },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  label: { ...type.label, color: colors.muted },
  metric: { ...type.number, fontSize: 26, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: space.hairline, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.amber, borderColor: colors.amberInk },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: space.line, borderColor: colors.muted },
  dotOn: { backgroundColor: colors.amberInk, borderColor: colors.amberInk },
  pressed: { opacity: 0.7 },
  compress: { transform: [{ scale: motion.press }] },
  caption: { color: colors.muted, fontWeight: '700', alignSelf: 'center' },
});
