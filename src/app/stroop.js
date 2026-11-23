import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import Pause from '../components/Pause';
import { useFeedback } from '../feedback';
import { usePause } from '../use-pause';
import ResultModal from '../components/ResultModal';
import { colors, motion, space, stroopColors, type } from '../theme';

const CONGRUENT_RATE = 0.3;
const ROUND_MS = 30_000;
const colorNames = Object.keys(stroopColors);
const pairs = colorNames.flatMap((word) => colorNames.map((ink) => ({ word, ink })));

function nextTrial(previous) {
  const congruent = Math.random() < CONGRUENT_RATE;
  const options = pairs.filter((pair) => pair !== previous && (pair.word === pair.ink) === congruent);
  return options[Math.floor(Math.random() * options.length)];
}

export default function StroopScreen() {
  const start = useRef(0);
  const current = useRef(null);
  const answers = useRef([]);
  const [trial, setTrial] = useState(null);
  const [remaining, setRemaining] = useState(ROUND_MS / 1000);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, streak: 0, longest: 0, feedback: null });
  const [pulse] = useState(() => new Animated.Value(1));
  const { play, animate } = useFeedback();
  const { pausedAt, pause, resume } = usePause(start);
  const running = Boolean(trial) && !result;

  const finish = useCallback(() => {
    if (!current.current) return;
    current.current = null;
    const count = answers.current.length;
    const correct = answers.current.filter((answer) => answer.correct).length;
    const average = count ? Math.round(answers.current.reduce((sum, answer) => sum + answer.ms, 0) / count) : null;
    setRemaining(0);
    setResult({ correct, wrong: count - correct, average });
  }, []);

  useEffect(() => {
    if (!running || pausedAt !== null) return;
    const interval = setInterval(() => {
      const ms = ROUND_MS - (Date.now() - start.current);
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    }, 100);
    const deadline = setTimeout(finish, Math.max(0, start.current + ROUND_MS - Date.now()));
    return () => {
      clearInterval(interval);
      clearTimeout(deadline);
    };
  }, [finish, pausedAt, running]);

  useEffect(() => {
    if (!animate) pulse.setValue(1);
    return () => pulse.stopAnimation();
  }, [animate, pulse]);

  function resumeRound() {
    const duration = resume();
    if (current.current) current.current.at += duration;
  }

  function begin() {
    resume();
    pulse.setValue(1);
    setStats({ correct: 0, wrong: 0, streak: 0, longest: 0, feedback: null });
    const pair = nextTrial(null);
    const at = Date.now();
    start.current = at;
    current.current = { pair, at };
    answers.current = [];
    setRemaining(ROUND_MS / 1000);
    setResult(null);
    setTrial(pair);
  }

  const answer = useCallback((color) => {
    const active = current.current;
    if (!active || active.pair !== trial || pausedAt !== null) return;
    const at = Date.now();
    if (at - start.current >= ROUND_MS) return finish();
    const correct = color === active.pair.ink;
    answers.current.push({ correct, ms: at - active.at });
    play(correct ? 'correct' : 'wrong');
    setStats((previous) => {
      const streak = correct ? previous.streak + 1 : 0;
      return {
        correct: previous.correct + Number(correct),
        wrong: previous.wrong + Number(!correct),
        streak,
        longest: Math.max(previous.longest, streak),
        feedback: correct ? 'Correct' : 'Miss',
      };
    });
    if (animate) {
      pulse.setValue(0.94);
      Animated.timing(pulse, { toValue: 1, duration: motion.release, useNativeDriver: true }).start();
    }
    const pair = nextTrial(active.pair);
    current.current = { pair, at: Date.now() };
    setTrial(pair);
  }, [animate, finish, pausedAt, play, pulse, trial]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page}>
        {!trial ? (
          <Reveal style={[styles.content, styles.intro]}>
            <Text style={styles.label}>30-second sprint</Text>
            <Text accessibilityRole="header" style={styles.introTitle}>Match the ink</Text>
            <Text style={styles.demo}>BLUE</Text>
            <Text style={styles.instruction}>The ink is red. Tap the matching color.</Text>
            <Button primary title="Start" onPress={begin} />
          </Reveal>
        ) : (
          <View style={[styles.content, styles.playfield]}>
            <View style={styles.hud}>
              <View><Text style={styles.label}>Score</Text><Text style={styles.metric}>{Math.max(0, stats.correct - stats.wrong)}</Text></View>
              <View><Text style={styles.label}>Combo</Text><Text style={styles.metric}>{stats.streak}×</Text></View>
              <View><Text style={styles.label}>Time</Text><Text style={[styles.metric, remaining <= 5 && styles.warning]}>{remaining}s</Text></View>
              <Button title="Pause" onPress={pause} disabled={!running} />
            </View>
            <View style={styles.track} accessible={false}>
              <View style={[styles.fill, remaining <= 5 && styles.urgent, { width: `${remaining / (ROUND_MS / 1000) * 100}%` }]} />
            </View>
            <View style={styles.prompt}>
              <Text style={styles.promptLabel}>Match the ink</Text>
              <Animated.Text adjustsFontSizeToFit numberOfLines={1} style={[styles.word, { color: stroopColors[trial.ink], transform: [{ scale: pulse }] }]}>{trial.word}</Animated.Text>
              <Text style={[styles.feedback, stats.feedback === 'Miss' && styles.feedbackMiss]}>
                {stats.feedback === 'Correct' ? `✓ Correct${stats.streak > 1 ? ` · ${stats.streak} combo` : ''}` : stats.feedback === 'Miss' ? '× Miss' : ' '}
              </Text>
            </View>
            <View style={styles.answers}>
              {colorNames.map((color) => (
                <Pressable key={color} accessibilityRole="button" accessibilityLabel={color}
                  onPress={() => answer(color)}
                  style={({ pressed }) => [styles.answer, pressed && styles.pressed, pressed && animate && styles.compress]}>
                  <View style={[styles.swatch, { backgroundColor: stroopColors[color] }]} />
                  <Text style={styles.answerLabel}>{color}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      {pausedAt !== null && <Pause onResume={resumeRound} onRestart={begin} onLeave={() => router.back()} />}
      {result && (
        <ResultModal
          game="stroop"
          value={Math.max(0, result.correct - result.wrong)}
          onAgain={begin}
          onBack={() => router.back()}
        >
          <Text style={styles.text}>Correct: {result.correct}   Wrong: {result.wrong}</Text>
          <Text style={styles.text}>Longest combo: {stats.longest}</Text>
          <Text style={styles.text}>Average reaction time: {result.average === null ? '—' : `${result.average} ms`}</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, padding: space.page, alignItems: 'center' },
  content: { width: '100%', maxWidth: space.maxBoard, gap: space.md },
  playfield: { flexGrow: 1, paddingBottom: space.sm },
  intro: { backgroundColor: colors.peach, padding: space.lg, borderRadius: space.card },
  introTitle: { ...type.heading, color: colors.peachInk },
  demo: { ...type.display, color: stroopColors.RED, backgroundColor: colors.hero, textAlign: 'center', padding: space.md },
  label: { ...type.label, color: colors.muted },
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.xs },
  metric: { ...type.number, fontSize: 25, color: colors.text },
  instruction: { color: colors.peachInk, fontSize: 16, lineHeight: 23 },
  track: { backgroundColor: colors.tint, height: space.sm, borderRadius: space.sm, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: space.sm },
  prompt: { flexGrow: 1, minHeight: 170, justifyContent: 'center', backgroundColor: colors.text, borderRadius: space.card, paddingHorizontal: space.md, paddingVertical: space.page, gap: space.sm },
  promptLabel: { color: colors.heroText, textAlign: 'center', fontWeight: '700' },
  warning: { color: colors.error },
  urgent: { backgroundColor: colors.error },
  word: { ...type.display, fontSize: 68, color: colors.paper, textAlign: 'center' },
  feedback: { color: colors.lime, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  feedbackMiss: { color: colors.peach },
  answers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm },
  answer: { width: '48%', minHeight: 66, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: space.line, borderColor: colors.text, borderRadius: space.radius, backgroundColor: colors.paper },
  answerLabel: { color: colors.text, fontWeight: '900', flexShrink: 1 },
  swatch: { width: 15, height: 15, borderWidth: space.hairline, borderColor: colors.text },
  pressed: { backgroundColor: colors.peach },
  compress: { transform: [{ scale: motion.press }] },
  text: { color: colors.text },
});
