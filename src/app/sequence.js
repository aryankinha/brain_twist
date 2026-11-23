import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { Animated, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ResultModal from '../components/ResultModal';
import Reveal from '../components/Reveal';
import { levelKey, readDifficulty } from '../difficulty';
import { gameLabels } from '../format';
import { getBest } from '../storage';
import { useFeedback } from '../feedback';
import { flashDuration, initialSequence, nextTile, sequenceLevels, sequenceReducer } from '../games/sequence';
import { useGamePulse } from '../use-game-pulse';
import { colors, motion, space, type } from '../theme';

const shapes = [
  ['Circle', '●'], ['Square', '■'], ['Triangle', '▲'], ['Diamond', '◆'],
  ['Star', '★'], ['Cross', '✚'], ['Ring', '○'], ['Hexagon', '⬢'],
  ['Down triangle', '▼'], ['Heart', '♥'], ['Sun', '☀︎'], ['Crescent', '☾'],
  ['Outline diamond', '◇'], ['Outline square', '□'], ['Right triangle', '▶︎'], ['Four-point star', '✦'],
];
const palette = [
  [colors.violet, colors.violetInk], [colors.sky, colors.skyInk],
  [colors.amber, colors.amberInk], [colors.tint, colors.accent],
];

export default function SequenceScreen() {
  const { difficulty: requested } = useLocalSearchParams();
  const difficulty = readDifficulty(requested);
  const game = levelKey('sequence', difficulty);
  const { size, opening, flash } = sequenceLevels[difficulty];
  const count = size * size;
  const [best, setBest] = useState(null);
  const [round, dispatch] = useReducer(sequenceReducer, initialSequence);
  const [foreground, setForeground] = useState(true);
  const { bump, pulse } = useGamePulse();
  const { play, animate } = useFeedback();
  const { phase, score, pattern, step, cue, miss } = round;

  useEffect(() => { getBest(game).then(setBest).catch(() => {}); }, [game]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setForeground(active);
      if (active) dispatch({ type: 'resume-preview' });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!foreground) return;
    if (phase === 'watch') {
      const delay = cue !== null ? flashDuration(score, flash) : step === 0 ? 420 : 170;
      const timeout = setTimeout(() => dispatch({ type: 'tick' }), delay);
      return () => clearTimeout(timeout);
    }
    if (phase === 'clear') {
      const timeout = setTimeout(() => dispatch({ type: 'advance', tile: nextTile(pattern.at(-1), count) }), 650);
      return () => clearTimeout(timeout);
    }
  }, [count, cue, flash, foreground, pattern, phase, score, step]);

  useEffect(() => { if (cue !== null || phase === 'clear') bump(0.82); }, [bump, cue, phase]);

  function begin() {
    const pattern = [];
    for (let i = 0; i < opening; i++) pattern.push(nextTile(pattern.at(-1), count));
    dispatch({ type: 'start', pattern });
  }

  const tap = useCallback((tile) => {
    if (phase !== 'input' || !foreground) return;
    play(pattern[step] === tile ? 'correct' : 'wrong');
    dispatch({ type: 'press', tile });
  }, [foreground, pattern, phase, play, step]);

  const prompt = {
    watch: 'Watch the pattern',
    input: 'Your turn', clear: '✓ Round cleared', over: 'Sequence missed', ready: '',
  }[phase];
  const progress = phase === 'input' ? step : phase === 'clear' ? pattern.length : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: gameLabels[game] }} />
      <ScrollView contentContainerStyle={styles.page}>
        {phase === 'ready' ? (
          <Reveal style={styles.playfield}>
            <View style={styles.intro}>
              <Text style={styles.label}>{size} × {size} board · {opening} opening cues</Text>
              <Text accessibilityRole="header" style={styles.title}>Watch. Remember. Repeat.</Text>
              <View style={styles.demo} accessible={false}>
                {shapes.slice(0, 4).map(([label, glyph], index) => (
                  <View key={label} style={[styles.demoTile, { backgroundColor: palette[index][0] }]}>
                    <Text style={[styles.demoGlyph, { color: palette[index][1] }]}>{glyph}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.body}>Repeat the flashes. Each round adds one shape.</Text>
              <Text style={styles.label}>Best: {best == null ? '—' : `${best} rounds`}</Text>
            </View>
            <Button primary title="Start sequence" onPress={begin} />
          </Reveal>
        ) : (
          <View style={styles.playfield}>
            <View style={styles.hud}>
              <View><Text style={styles.label}>Cleared</Text><Text style={styles.metric}>{score}</Text></View>
              <View><Text style={styles.label}>Pattern</Text><Text style={styles.metric}>{pattern.length}</Text></View>
              <Animated.View style={[styles.phase, phase === 'clear' && styles.clear, { transform: [{ scale: pulse }] }]}><Text accessibilityLiveRegion="polite" accessibilityLabel={cue === null ? prompt : shapes[cue][0]} style={styles.phaseText}>{prompt}</Text></Animated.View>
            </View>
            <View style={styles.progress} accessible accessibilityLabel={`${progress} of ${pattern.length} shapes repeated`}>
              <View style={[styles.fill, { width: `${progress / pattern.length * 100}%` }]} />
            </View>
            <View style={styles.grid}>
              {shapes.slice(0, count).map(([label, glyph], index) => {
                const [backgroundColor, ink] = palette[index % palette.length];
                const active = cue === index;
                const hit = phase === 'input' && step > 0 && pattern[step - 1] === index;
                const failed = phase === 'over' && miss === index;
                return (
                  <Pressable key={label} accessibilityRole="button"
                    accessibilityLabel={label} accessibilityState={{ disabled: phase !== 'input', selected: active }}
                    disabled={phase !== 'input'} onPress={() => tap(index)}
                    style={({ pressed }) => [
                      styles.pad, { width: `${96 / size}%`, backgroundColor, borderColor: active || hit ? ink : colors.border },
                      active && { backgroundColor: ink }, failed && styles.failed, pressed && styles.pressed,
                      animate && (pressed || active) && styles.compress,
                    ]}>
                    <Text allowFontScaling={false} style={[styles.glyph, { fontSize: size === 4 ? 28 : 44, color: active ? colors.paper : ink }]}>{glyph}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.footer}><Text style={styles.caption}>{progress} / {pattern.length} repeated</Text><Text style={styles.caption}>Best {best ?? '—'}</Text></View>
          </View>
        )}
      </ScrollView>
      {phase === 'over' && (
        <ResultModal game={game} value={score} onAgain={begin} onBack={() => router.back()} title="Sequence ended">
          <Text style={styles.body}>Expected {shapes[pattern[step]][1]} at position {step + 1}.</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', padding: space.page },
  playfield: { width: '100%', maxWidth: space.maxBoard, gap: space.page },
  intro: { padding: space.page, gap: space.md, backgroundColor: colors.violet, borderRadius: space.card },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: space.md, backgroundColor: colors.surface, borderRadius: space.radius },
  demo: { flexDirection: 'row', gap: space.xs },
  demoTile: { width: 48, height: 48, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center' },
  demoGlyph: { fontSize: 24 },
  title: { ...type.heading, color: colors.text },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  hud: { flexDirection: 'row', gap: space.page, alignItems: 'center' },
  label: { ...type.label, color: colors.muted },
  metric: { ...type.number, fontSize: 27, color: colors.text },
  phase: { flex: 1, borderRadius: space.radius, padding: space.sm, backgroundColor: colors.violet, alignItems: 'center' },
  clear: { backgroundColor: colors.arcadeLime },
  phaseText: { color: colors.violetInk, fontWeight: '800', textAlign: 'center' },
  progress: { height: 5, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.violetInk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  pad: { aspectRatio: 1, borderRadius: space.card, borderWidth: space.line, justifyContent: 'center', alignItems: 'center', gap: space.xs },
  glyph: { fontWeight: '900', includeFontPadding: false },
  failed: { borderColor: colors.error },
  pressed: { opacity: 0.72 },
  compress: { transform: [{ scale: motion.press }] },
  caption: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
});
