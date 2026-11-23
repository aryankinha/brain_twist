import { router } from 'expo-router';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ResultModal from '../components/ResultModal';
import Reveal from '../components/Reveal';
import { useFeedback } from '../feedback';
import { flashDuration, initialSequence, nextTile, sequenceReducer } from '../games/sequence';
import { colors, motion, space, type } from '../theme';

const pads = [
  { label: 'Circle', glyph: '●', backgroundColor: colors.violet, ink: colors.violetInk },
  { label: 'Square', glyph: '■', backgroundColor: colors.sky, ink: colors.skyInk },
  { label: 'Triangle', glyph: '▲', backgroundColor: colors.amber, ink: colors.amberInk },
  { label: 'Diamond', glyph: '◆', backgroundColor: colors.tint, ink: colors.accent },
];

export default function SequenceScreen() {
  const [round, dispatch] = useReducer(sequenceReducer, initialSequence);
  const [foreground, setForeground] = useState(true);
  const { play, animate } = useFeedback();
  const { phase, score, pattern, step, cue, miss } = round;

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
      const delay = cue !== null ? flashDuration(score) : step === 0 ? 420 : 170;
      const timeout = setTimeout(() => dispatch({ type: 'tick' }), delay);
      return () => clearTimeout(timeout);
    }
    if (phase === 'clear') {
      const timeout = setTimeout(() => dispatch({ type: 'advance', tile: nextTile(pattern.at(-1)) }), 650);
      return () => clearTimeout(timeout);
    }
  }, [cue, foreground, pattern, phase, score, step]);

  function begin() {
    const first = nextTile(null);
    const second = nextTile(first);
    dispatch({ type: 'start', pattern: [first, second, nextTile(second)] });
  }

  const tap = useCallback((tile) => {
    if (phase !== 'input' || !foreground) return;
    play(pattern[step] === tile ? 'correct' : 'wrong');
    dispatch({ type: 'press', tile });
  }, [foreground, pattern, phase, play, step]);

  const prompt = {
    watch: cue === null ? 'Watch the pattern' : pads[cue].label,
    input: 'Your turn', clear: '✓ Round cleared', over: 'Sequence missed', ready: '',
  }[phase];
  const progress = phase === 'input' ? step : phase === 'clear' ? pattern.length : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page}>
        {phase === 'ready' ? (
          <Reveal style={styles.playfield}>
            <View style={styles.demo} accessible={false}>
              {pads.map((pad) => (
                <View key={pad.label} style={[styles.demoTile, { backgroundColor: pad.backgroundColor }]}>
                  <Text style={[styles.demoGlyph, { color: pad.ink }]}>{pad.glyph}</Text>
                </View>
              ))}
            </View>
            <Text accessibilityRole="header" style={styles.title}>Watch. Remember. Repeat.</Text>
            <Text style={styles.body}>Repeat the shapes in order. Each round adds one shape and speeds up the flash.</Text>
            <Button primary title="Start sequence" onPress={begin} />
          </Reveal>
        ) : (
          <View style={styles.playfield}>
            <View style={styles.hud}>
              <View><Text style={styles.label}>Cleared</Text><Text style={styles.metric}>{score}</Text></View>
              <View><Text style={styles.label}>Pattern</Text><Text style={styles.metric}>{pattern.length}</Text></View>
              <View style={styles.phase}><Text accessibilityLiveRegion="polite" style={styles.phaseText}>{prompt}</Text></View>
            </View>
            <View style={styles.progress} accessible accessibilityLabel={`${progress} of ${pattern.length} shapes repeated`}>
              <View style={[styles.fill, { width: `${progress / pattern.length * 100}%` }]} />
            </View>
            <View style={styles.grid}>
              {pads.map((pad, index) => {
                const active = cue === index;
                const hit = phase === 'input' && step > 0 && pattern[step - 1] === index;
                const failed = phase === 'over' && miss === index;
                return (
                  <Pressable key={pad.label} accessibilityRole="button"
                    accessibilityLabel={pad.label} accessibilityState={{ disabled: phase !== 'input', selected: active }}
                    disabled={phase !== 'input'} onPress={() => tap(index)}
                    style={({ pressed }) => [
                      styles.pad, { backgroundColor: pad.backgroundColor, borderColor: active || hit ? pad.ink : colors.border },
                      active && { backgroundColor: pad.ink }, failed && styles.failed, pressed && styles.pressed,
                      animate && (pressed || active) && styles.compress,
                    ]}>
                    <Text style={[styles.glyph, { color: active ? colors.paper : pad.ink }]}>{pad.glyph}</Text>
                    <Text style={[styles.padLabel, { color: active ? colors.paper : pad.ink }]}>{hit ? '✓ ' : ''}{pad.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.caption}>{phase === 'input' ? `${step} / ${pattern.length} repeated` : ' '}</Text>
          </View>
        )}
      </ScrollView>
      {phase === 'over' && (
        <ResultModal game="sequence" value={score} onAgain={begin} onBack={() => router.back()} title="Sequence ended">
          <Text style={styles.body}>Expected {pads[pattern[step]].label.toLowerCase()} at position {step + 1}.</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.page },
  playfield: { width: '100%', maxWidth: space.maxBoard, gap: space.page },
  demo: { flexDirection: 'row', gap: space.xs },
  demoTile: { width: 48, height: 48, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center' },
  demoGlyph: { fontSize: 24 },
  title: { ...type.heading, color: colors.text },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  hud: { flexDirection: 'row', gap: space.page, alignItems: 'center' },
  label: { ...type.label, color: colors.muted },
  metric: { ...type.number, fontSize: 27, color: colors.text },
  phase: { flex: 1, borderRadius: space.radius, padding: space.sm, backgroundColor: colors.violet, alignItems: 'center' },
  phaseText: { color: colors.violetInk, fontWeight: '800', textAlign: 'center' },
  progress: { height: 5, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.violetInk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm },
  pad: { width: '48%', aspectRatio: 1.15, borderRadius: space.card, borderWidth: space.line, justifyContent: 'center', alignItems: 'center', gap: space.xs },
  glyph: { fontSize: 44, lineHeight: 55, fontWeight: '900' },
  padLabel: { fontSize: 14, fontWeight: '800' },
  failed: { borderColor: colors.error },
  pressed: { opacity: 0.72 },
  compress: { transform: [{ scale: motion.press }] },
  caption: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
});
