import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { Animated, AppState, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameBrief from '../components/GameBrief';
import PrototypeSwitcher from '../components/PrototypeSwitcher';
import { sequencePrototypeNames, VariantA, VariantB, VariantC } from '../components/SequencePrototype';
import ResultModal from '../components/ResultModal';
import SequenceMark from '../components/SequenceMark';
import { levelKey, readDifficulty } from '../difficulty';
import { useFeedback } from '../feedback';
import { gameLabels } from '../format';
import { buildRound, expectedTile, initialSequence, multiplier, sequenceLevels, sequenceReducer } from '../games/sequence';
import { getBest } from '../storage';
import { colors, motion, space, type } from '../theme';

const tiles = [
  ['Circle', '●', colors.violet, colors.violetInk],
  ['Square', '■', colors.sky, colors.skyInk],
  ['Triangle', '▲', colors.amber, colors.amberInk],
  ['Diamond', '◆', colors.tint, colors.accent],
  ['Star', '★', colors.peach, colors.peachInk],
  ['Cross', '✚', colors.lime, colors.limeInk],
  ['Ring', '○', colors.errorFill, colors.error],
  ['Hexagon', '⬢', colors.arcadeWhite, colors.arcadeShade],
  ['Crescent', '☾', colors.heroText, colors.hero],
];
const twists = {
  ghost: ['Ghost', 'Watch for faint flashes.'],
  echo: ['Echo', 'Repeat the first half to unlock the rest.'],
  reverse: ['Reverse', 'Repeat the pattern backwards.'],
  shuffle: ['Shuffle', 'The shapes moved. Follow their new positions.'],
  decoy: ['Decoy', 'Ignore the flash marked ×.'],
  timed: ['Timed', 'Tap before the time bar runs out.'],
};
const designPreviews = __DEV__ || process.env.EXPO_PUBLIC_SEQUENCE_PREVIEWS === '1';
const prototypeLayouts = { A: VariantA, B: VariantB, C: VariantC };

function changeVariant(variant) {
  router.setParams({ variant });
}

const pitches = [0.75, 0.84, 0.94, 1, 1.12, 1.26, 1.33, 1.5, 1.68];

export default function SequenceScreen() {
  const { difficulty: requested, variant } = useLocalSearchParams();
  const Prototype = designPreviews && typeof variant === 'string' && Object.hasOwn(prototypeLayouts, variant)
    ? prototypeLayouts[variant] : null;
  const difficulty = readDifficulty(requested);
  const game = levelKey('sequence', difficulty);
  const { opening, bosses } = sequenceLevels[difficulty];
  const [best, setBest] = useState(null);
  const [round, dispatch] = useReducer(sequenceReducer, initialSequence);
  const [foreground, setForeground] = useState(true);
  const [shownPoints, setShownPoints] = useState(0);
  const [clock] = useState(() => new Animated.Value(1));
  const [shake] = useState(() => new Animated.Value(0));
  const [waves] = useState(() => tiles.map(() => new Animated.Value(0)));
  const { play, playClip, animate } = useFeedback();
  const tone = useAudioPlayer(require('../../assets/audio/sequence-tone.wav'), { downloadFirst: true });
  const { phase, number, cleared, points, combo, lives, pattern, board, cue, cursor, step, miss, rules, timedOut } = round;
  const twist = rules?.twist;
  const boss = twist ? twists[twist] : null;
  const size = rules?.size ?? 2;

  useEffect(() => {
    let active = true;
    getBest(game).then((value) => { if (active) setBest(value); }).catch(() => {});
    return () => { active = false; };
  }, [game]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setForeground(active);
      if (active) dispatch({ type: 'resume' });
    });
    return () => { subscription.remove(); };
  }, []);

  const playTone = useCallback((tile) => {
    playClip(tone, pitches[tile] * (1 + Math.min(combo, 5) * 0.022));
  }, [combo, playClip, tone]);

  useEffect(() => {
    if (!foreground || phase !== 'watch') return;
    const delay = cue ? rules.flash : cursor === 0 ? (boss ? 900 : 420) : rules.gap;
    const timer = setTimeout(() => dispatch({ type: 'tick' }), delay);
    return () => clearTimeout(timer);
  }, [boss, cue, cursor, foreground, phase, rules]);

  useEffect(() => {
    if (foreground && cue && !cue.fake) playTone(cue.tile);
  }, [cue, foreground, playTone]);

  useEffect(() => {
    if (!foreground || phase !== 'input' || !rules.tapTime) return;
    clock.setValue(1);
    const countdown = Animated.timing(clock, { toValue: 0, duration: rules.tapTime, easing: Easing.linear, useNativeDriver: false, isInteraction: false });
    countdown.start();
    const timer = setTimeout(() => dispatch({ type: 'timeout', number, step }), rules.tapTime);
    return () => { clearTimeout(timer); countdown.stop(); };
  }, [clock, foreground, number, phase, rules, step]);

  useEffect(() => {
    if (!foreground || (phase !== 'clear' && phase !== 'miss')) return;
    const timer = setTimeout(() => {
      if (phase === 'miss') dispatch({ type: 'retry' });
      else dispatch({ type: 'round', round: buildRound(difficulty, number + 1, round) });
    }, phase === 'miss' ? (lives ? 950 : 540) : 780);
    return () => clearTimeout(timer);
  }, [difficulty, foreground, lives, number, phase, round]);

  useEffect(() => {
    if (!foreground || phase !== 'miss') return;
    play('wrong');
  }, [foreground, phase, play]);

  useEffect(() => {
    if (!animate) return;
    if (phase === 'clear') {
      const ripple = Animated.stagger(34, board.map((tile) => Animated.sequence([
        Animated.timing(waves[tile], { toValue: 1, duration: 100, useNativeDriver: true, isInteraction: false }),
        Animated.timing(waves[tile], { toValue: 0, duration: 180, useNativeDriver: true, isInteraction: false }),
      ])));
      ripple.start();
      return () => { ripple.stop(); waves.forEach((wave) => wave.setValue(0)); };
    }
    if (phase === 'miss') {
      const nudge = Animated.sequence([-5, 5, -3, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 42, useNativeDriver: true, isInteraction: false })));
      nudge.start();
      return () => { nudge.stop(); shake.setValue(0); };
    }
  }, [animate, board, phase, shake, waves]);

  useEffect(() => {
    if (!animate || points === 0 || phase !== 'clear') return;
    const from = points - pattern.length * 10 * multiplier(combo);
    const started = Date.now();
    const timer = setInterval(() => {
      const fraction = Math.min(1, (Date.now() - started) / 380);
      setShownPoints(Math.round(from + (points - from) * (1 - (1 - fraction) ** 3)));
      if (fraction === 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [animate, combo, pattern.length, phase, points]);

  function begin() {
    if (phase === 'over' && !Prototype) {
      setBest((old) => old == null ? cleared : Math.max(old, cleared));
    }
    dispatch({ type: 'round', round: buildRound(difficulty, 1, null) });
    play('tap');
  }

  function tap(tile) {
    if (phase !== 'input' || !foreground) return;
    if (tile === expectedTile(round)) {
      play('tap', false);
      playTone(tile);
    }
    dispatch({ type: 'press', tile });
  }

  const milestone = phase === 'clear' && [5, 10, 15].includes(cleared);
  const prompt = {
    watch: step > 0 ? 'Watch the second half' : 'Watch the pattern',
    input: twist === 'reverse' ? 'Your turn · backwards' : 'Your turn',
    clear: milestone ? `Round ${cleared} cleared` : 'Round cleared',
    miss: lives === 0 ? 'Last life lost' : timedOut ? 'Time up · replay' : 'Life lost · replay',
    over: 'Run complete', ready: '',
  }[phase];
  const near = best == null ? 0 : best - cleared;
  const nearBest = near === 1 || near === 2;
  const progress = pattern.length ? step / pattern.length : 0;
  const displayPoints = animate && points > 0 && phase === 'clear' ? shownPoints : points;
  const prototype = {
    animate, best, begin, board, boss, cleared, clock, combo: multiplier(combo), cue, foreground, length: pattern.length || opening,
    lastHit: round.lastHit, lives, miss, number, opening, phase, points: displayPoints, prompt, shake, size, step,
    tap, tiles, twist, waves, onExit: () => changeVariant('regular'),
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{
        title: gameLabels[game],
        headerRight: designPreviews && phase === 'ready' && !Prototype ? () => (
          <Pressable accessibilityRole="button" accessibilityLabel="Compare designs"
            onPress={() => changeVariant('A')} style={({ pressed }) => [styles.designAction, pressed && styles.designPressed]}>
            <Text style={styles.designText}>Designs</Text>
          </Pressable>
        ) : undefined,
      }} />
      <ScrollView contentContainerStyle={styles.page}>
        {Prototype ? <Prototype model={prototype} /> : phase === 'ready' ? (
          <GameBrief kicker={`2 × 2 · ${opening} opening cues`} title="Watch. Remember. Repeat." tone={colors.violet}
            detail={`You have 3 lives. Every fifth round brings a ${twists[bosses[0]][0]} or ${twists[bosses[1]][0]} boss.`}
            best={best == null ? '—' : `${best} rounds`} startLabel="Start sequence" onStart={begin}>
            <SequenceMark size={170} />
          </GameBrief>
        ) : (
          <View style={styles.playfield}>
            <View style={styles.hud}>
              <View style={styles.stat}><Text style={styles.label}>Cleared</Text><Text style={styles.metric}>{cleared}</Text></View>
              <View style={styles.stat}><Text style={styles.label}>Pattern</Text><Text style={styles.metric}>{pattern.length}</Text></View>
              <View style={styles.stat} accessible accessibilityLabel={`Lives: ${lives} of 3`}>
                <Text style={styles.label}>Lives</Text>
                <View style={styles.lives}>{[0, 1, 2].map((index) => <View key={index} style={[styles.life, index < lives && styles.lifeFull]} />)}</View>
              </View>
            </View>
            <View style={styles.status}>
              <View style={[styles.phase, boss && styles.boss, phase === 'clear' && styles.clear,
                (phase === 'miss' || phase === 'over') && styles.warning]}>
                <Text accessibilityLiveRegion="polite" style={[styles.phaseText, boss && styles.bossInk,
                  (phase === 'miss' || phase === 'over') && styles.warningInk]}>{prompt}</Text>
                <Text style={styles.srOnly} accessibilityLiveRegion="polite">{cue ? (cue.fake ? 'Decoy' : tiles[cue.tile][0]) : ''}</Text>
              </View>
              {boss && <Text style={styles.rule}><Text style={styles.ruleName}>Boss {number} · {boss[0]}. </Text>{boss[1]}</Text>}
            </View>
            <View style={styles.tracks}>
              <View style={styles.progress} accessible accessibilityLabel={`${step} of ${pattern.length} shapes repeated`}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
              {twist === 'timed' && (
                <View style={[styles.progress, styles.timer]} accessibilityLabel="Time remaining for this tap">
                  <Animated.View style={[styles.fill, styles.timeFill, { width: phase === 'input'
                    ? clock.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '100%' }]} />
                </View>
              )}
            </View>
            <Animated.View style={[styles.grid, { transform: [{ translateX: shake }] }]}>
              {board.map((id) => {
                const [label, glyph, backgroundColor, ink] = tiles[id];
                const active = cue?.tile === id;
                const fake = active && cue.fake;
                const ghost = active && !fake && twist === 'ghost';
                const strong = active && !fake && !ghost;
                const failed = miss === id && (phase === 'miss' || phase === 'over');
                const hit = round.lastHit === id && phase === 'input';
                return (
                  <Pressable key={id} accessibilityRole="button" accessibilityLabel={label}
                    accessibilityState={{ selected: active, disabled: phase !== 'input' || !foreground }}
                    disabled={phase !== 'input' || !foreground} onPress={() => tap(id)}
                    style={({ pressed }) => [styles.pad, {
                      width: size === 3 ? '32%' : '49%', backgroundColor, borderColor: hit ? ink : 'transparent',
                    }, strong && { backgroundColor: ink }, fake && styles.fake, failed && styles.failed,
                    pressed && { borderColor: ink, opacity: 0.76 }, pressed && animate && styles.compress]}>
                    {({ pressed }) => <>
                      {pressed && <View pointerEvents="none" style={styles.touchGlow} />}
                      <Text allowFontScaling={false} style={[styles.glyph, { fontSize: size === 3 ? 34 : 45,
                        color: strong ? colors.paper : ink, opacity: ghost ? 0.34 : 1 }]}>{fake ? '×' : glyph}</Text>
                      <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: ink, opacity: waves[id] }]} />
                    </>}
                  </Pressable>
                );
              })}
            </Animated.View>
            <View style={styles.footer}>
              <View><Text style={styles.caption}>{step} / {pattern.length} repeated</Text><Text style={styles.caption}>Best {best ?? '—'}</Text></View>
              <View style={styles.points}><Text style={styles.score}>{displayPoints} pts</Text><Text style={styles.caption}>{combo > 1 ? `×${multiplier(combo)} combo` : 'Run score'}</Text></View>
            </View>
          </View>
        )}
      </ScrollView>
      {Prototype && <View pointerEvents="box-none" style={styles.switcherDock}>
        <PrototypeSwitcher current={variant} onChange={changeVariant} names={sequencePrototypeNames} style={styles.switcher} />
      </View>}
      {!Prototype && phase === 'over' && (
        <ResultModal game={game} value={cleared} onAgain={begin} onBack={() => router.back()} title="Sequence ended" showComparison={!nearBest}>
          <Text style={styles.body}>{nearBest ? `${near} ${near === 1 ? 'round' : 'rounds'} from your best`
            : timedOut ? 'You ran out of time on the last tap.' : `Next was ${tiles[expectedTile(round)][0].toLowerCase()}.`}</Text>
          <Text style={styles.body}>Run score · {points} pts</Text>
        </ResultModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { flexGrow: 1, alignItems: 'center', padding: space.page },
  designAction: { minHeight: space.tap, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  designText: { color: colors.violetInk, fontWeight: '900' },
  designPressed: { opacity: 0.65 },
  switcherDock: { height: 58 },
  switcher: { position: 'relative', bottom: 0 },
  playfield: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: space.maxBoard, gap: space.md },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: space.md },
  stat: { flex: 1, minWidth: 64, gap: space.xs },
  label: { ...type.label, color: colors.muted, letterSpacing: 1.1 },
  metric: { ...type.number, fontSize: 27, color: colors.arcade },
  lives: { minHeight: 32, flexDirection: 'row', gap: space.xs, alignItems: 'center' },
  life: { width: 9, height: 9, borderRadius: 5, borderWidth: space.hairline, borderColor: colors.violetInk },
  lifeFull: { backgroundColor: colors.violetInk },
  status: { minHeight: 48, gap: space.xs, alignItems: 'flex-start' },
  phase: { borderRadius: space.radius, paddingHorizontal: space.md, paddingVertical: space.xs, backgroundColor: colors.violet },
  phaseText: { color: colors.violetInk, fontWeight: '900' },
  boss: { backgroundColor: colors.amber },
  bossInk: { color: colors.amberInk },
  clear: { backgroundColor: colors.lime },
  warning: { backgroundColor: colors.errorFill },
  warningInk: { color: colors.error },
  rule: { color: colors.muted, fontSize: 13 },
  ruleName: { color: colors.arcade, fontWeight: '800' },
  tracks: { minHeight: 12, gap: space.xs },
  progress: { height: 4, backgroundColor: colors.violet, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.violetInk },
  timer: { backgroundColor: colors.amber },
  timeFill: { backgroundColor: colors.amberInk },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  pad: { aspectRatio: 1, borderRadius: space.radius, borderWidth: space.line, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  glyph: { fontWeight: '900', includeFontPadding: false },
  fake: { borderColor: colors.amberInk, borderStyle: 'dashed' },
  failed: { backgroundColor: colors.errorFill, borderColor: colors.error },
  touchGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.paper, opacity: 0.32 },
  ripple: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: space.radius, borderWidth: 3 },
  compress: { transform: [{ scale: motion.press }] },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm, padding: space.md, backgroundColor: colors.surface, borderRadius: space.radius },
  points: { alignItems: 'flex-end' },
  score: { fontVariant: ['tabular-nums'], color: colors.arcade, fontWeight: '900' },
  caption: { color: colors.muted, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
