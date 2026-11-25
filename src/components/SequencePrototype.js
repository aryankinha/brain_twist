// Three Sequence Memory variants on /sequence, driven by the real round and selected with ?variant=A, B, or C.
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, motion, space, type } from '../theme';
import Button from './Button';

export const sequencePrototypeNames = { A: 'Arcade Deck', B: 'Signal Lab', C: 'Orbit' };

function Lives({ lives, dark = false }) {
  return (
    <View style={styles.lifeGroup} accessible accessibilityLabel={`Lives: ${lives} of 3`}>
      {[0, 1, 2].map((index) => <View key={index} style={[styles.life, dark && styles.lifeDark,
        index < lives && (dark ? styles.lifeFullDark : styles.lifeFull)]} />)}
    </View>
  );
}

function Turn({ model, dark = false }) {
  const { boss, cue, number, phase, prompt, tiles } = model;
  const failed = phase === 'miss';
  return (
    <View style={styles.turn}>
      <Text accessibilityLiveRegion="polite" style={[styles.turnTitle, dark && styles.light, failed && !dark && styles.errorInk]}>
        {phase === 'ready' ? 'Watch. Remember. Repeat.' : prompt}
      </Text>
      {boss && <Text style={[styles.body, dark && styles.softLight]}><Text style={styles.heavy}>Boss {number} · {boss[0]}. </Text>{boss[1]}</Text>}
      <Text style={styles.srOnly} accessibilityLiveRegion="polite">{cue ? (cue.fake ? 'Decoy' : tiles[cue.tile][0]) : ''}</Text>
    </View>
  );
}

function Tiles({ model, layout }) {
  const { animate, board, cue, foreground, lastHit, miss, phase, shake, size, tap, tiles, twist, waves } = model;
  const arcade = layout === 'arcade';
  const orbit = layout === 'orbit';
  const input = phase === 'input' && foreground;
  return (
    <Animated.View style={[styles.grid, orbit && size === 2 && styles.orbitGrid, { transform: [{ translateX: shake }] }]}>
      {board.map((id) => {
        const [label, glyph, tint, ink] = tiles[id];
        const active = cue?.tile === id;
        const fake = active && cue.fake;
        const ghost = active && !fake && twist === 'ghost';
        const failed = phase === 'miss' && miss === id;
        const strong = active && !fake && !ghost;
        const fill = arcade || orbit ? tint : colors.paper;
        return (
          <Pressable key={id} accessibilityRole="button" accessibilityLabel={label}
            accessibilityState={{ disabled: !input, selected: active }}
            disabled={!input} onPress={() => tap(id)}
            style={({ pressed }) => [styles.pad, {
              width: size === 3 ? (orbit ? '30%' : '32%') : orbit ? '40%' : '49%',
              backgroundColor: strong ? ink : fill,
              borderColor: input && lastHit === id ? ink : arcade || orbit ? 'transparent' : colors.border,
            }, arcade && styles.deckPad, orbit && styles.orbitPad, fake && styles.decoy, failed && styles.failed,
            pressed && { borderColor: ink }, pressed && animate && styles.pressed]}>
            {({ pressed }) => <>
              {layout === 'lab' && <View style={[styles.padMarker, { backgroundColor: strong ? colors.paper : ink }]} />}
              {pressed && <View pointerEvents="none" style={styles.pressGlow} />}
              <Text allowFontScaling={false} style={[styles.glyph, {
                fontSize: size === 3 ? 32 : 42, color: strong ? colors.paper : ink, opacity: ghost ? 0.34 : 1,
              }]}>{fake ? '×' : glyph}</Text>
              <Animated.View pointerEvents="none" style={[styles.ripple, orbit && styles.orbitPad, { borderColor: ink, opacity: waves[id] }]} />
            </>}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

function Progress({ model, segmented = false, dark = false }) {
  const { clock, length, phase, step, twist } = model;
  return (
    <View style={styles.tracks}>
      <View accessible accessibilityLabel={`${step} of ${length} shapes repeated`}
        style={[segmented && length < 17 ? styles.segments : styles.track, dark && styles.trackDark]}>
        {segmented && length < 17
          ? Array.from({ length }, (_, i) => <View key={i} style={[styles.segment, i < step && styles.segmentDone]} />)
          : <View style={[styles.fill, dark && styles.fillLight, { width: `${length ? step / length * 100 : 0}%` }]} />}
      </View>
      {twist === 'timed' && <View accessibilityLabel="Time remaining for this tap" style={[styles.track, styles.timed]}>
        <Animated.View style={[styles.fill, styles.timedFill, { width: phase === 'input'
          ? clock.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '100%' }]} />
      </View>}
    </View>
  );
}

function Record({ model, dark = false }) {
  const { best, cleared, combo, points } = model;
  return (
    <View style={styles.record}>
      <Text style={[styles.recordText, dark && styles.softLight]}>{cleared} cleared · Best {best ?? '—'}</Text>
      <Text style={[styles.value, dark && styles.light]}>{points} pts{combo > 1 ? ` · ×${combo}` : ''}</Text>
    </View>
  );
}

function Action({ model }) {
  if (model.phase !== 'ready' && model.phase !== 'over') return null;
  return (
    <View style={styles.action}>
      {model.phase === 'ready' ? <>
        <Text style={styles.body}>{model.opening} opening cues · 3 lives · A boss every fifth round</Text>
        <Button title="Start sequence" primary onPress={model.begin} />
        <Button title="Return to regular game" onPress={model.onExit} />
      </> : <>
        <Text style={styles.body}>Preview complete. Check the other layouts or run this one again.</Text>
        <Button title="Play again" primary onPress={model.begin} />
      </>}
    </View>
  );
}

export function VariantA({ model }) {
  return (
    <View style={styles.layout}>
      <View style={styles.deck}>
        <View style={styles.deckMeta}>
          <Text style={styles.deckRound}>ROUND {model.number}</Text>
          <Lives lives={model.lives} dark />
        </View>
        <View style={styles.deckScreen}><Turn model={model} dark /></View>
        <Tiles model={model} layout="arcade" />
        <Record model={model} dark />
        <Text style={[styles.recordText, styles.softLight]}>{model.step} / {model.length} repeated</Text>
        <Progress model={model} dark />
      </View>
      <Action model={model} />
    </View>
  );
}

export function VariantB({ model }) {
  return (
    <View style={[styles.layout, styles.lab]}>
      <View style={styles.labLead}>
        <View style={styles.labMeta}>
          <Text style={styles.labRound}>Round {model.number}</Text>
          <Lives lives={model.lives} />
        </View>
        <Turn model={model} />
        <View style={styles.labReadout}>
          <Text style={styles.recordText}>{model.step} / {model.length} repeated</Text>
          <Progress model={model} segmented />
        </View>
      </View>
      <Tiles model={model} layout="lab" />
      <Record model={model} />
      <Action model={model} />
    </View>
  );
}

export function VariantC({ model }) {
  const { number, size, lives, step, length } = model;
  return (
    <View style={[styles.layout, styles.orbitLayout]}>
      <View style={styles.orbitStatus}><Turn model={model} /></View>
      <View style={styles.orbitBoard}>
        <View pointerEvents="none" style={styles.orbitRing} />
        <View pointerEvents="none" style={styles.orbitInner} />
        <Tiles model={model} layout="orbit" />
        {size === 2 && <View style={styles.orbitHub} pointerEvents="none">
          <Text style={styles.hubLabel}>ROUND</Text>
          <Text style={styles.hubValue}>{number}</Text>
        </View>}
      </View>
      <View style={styles.orbitReadout}>
        <Text style={styles.recordText}>{size === 3 ? `Round ${number} · ` : ''}{step} / {length} repeated</Text>
        <Lives lives={lives} />
      </View>
      <Progress model={model} />
      <Record model={model} />
      <Action model={model} />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, width: '100%', maxWidth: space.maxBoard, justifyContent: 'center', gap: space.md },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  heavy: { fontWeight: '900' },
  light: { color: colors.paper },
  softLight: { color: colors.arcadeWhite },
  lifeGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  life: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.violetInk },
  lifeDark: { borderColor: colors.arcadeViolet },
  lifeFull: { backgroundColor: colors.violetInk },
  lifeFullDark: { backgroundColor: colors.arcadeLime, borderColor: colors.arcadeLime },
  turn: { gap: space.xs },
  turnTitle: { ...type.heading, fontSize: 24, color: colors.arcade },
  errorInk: { color: colors.error },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  pad: { aspectRatio: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderColor: colors.border, borderWidth: 2, borderRadius: space.radius },
  glyph: { includeFontPadding: false, fontWeight: '900' },
  deckPad: { borderRadius: 18 },
  orbitPad: { borderRadius: 999 },
  padMarker: { position: 'absolute', top: space.sm, left: space.sm, width: 7, height: 7, borderRadius: 4 },
  pressed: { transform: [{ scale: motion.press }] },
  decoy: { borderStyle: 'dashed', borderColor: colors.amberInk },
  failed: { backgroundColor: colors.errorFill, borderColor: colors.error },
  pressGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.paper, opacity: 0.32 },
  ripple: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: space.radius, borderWidth: 3 },
  record: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  recordText: { color: colors.muted, fontWeight: '700', fontSize: 13, fontVariant: ['tabular-nums'] },
  value: { color: colors.arcade, fontWeight: '900', fontVariant: ['tabular-nums'] },
  action: { gap: space.sm },
  tracks: { minHeight: 14, gap: space.xs },
  track: { height: 5, backgroundColor: colors.violet, borderRadius: 3, overflow: 'hidden' },
  trackDark: { backgroundColor: colors.arcadeLine },
  fill: { height: '100%', backgroundColor: colors.violetInk },
  fillLight: { backgroundColor: colors.arcadeLime },
  timed: { backgroundColor: colors.amber },
  timedFill: { backgroundColor: colors.amberInk },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.violet },
  segmentDone: { backgroundColor: colors.violetInk },
  deck: { backgroundColor: colors.arcade, borderRadius: space.card, padding: space.md, gap: space.md },
  deckMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deckRound: { ...type.label, color: colors.arcadeLime },
  deckScreen: { backgroundColor: colors.arcadeLine, padding: space.md, minHeight: 82, justifyContent: 'center', borderRadius: space.radius },
  lab: { gap: space.page },
  labLead: { borderTopWidth: 3, borderColor: colors.arcade, paddingTop: space.md, minHeight: 155, gap: space.md },
  labMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labRound: { ...type.label, color: colors.accent },
  labReadout: { gap: space.xs, marginTop: 'auto' },
  orbitLayout: { gap: space.md },
  orbitStatus: { minHeight: 70, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.violet, borderRadius: space.radius, padding: space.sm },
  orbitBoard: { position: 'relative', padding: space.md },
  orbitGrid: { rowGap: space.xl, padding: space.xs },
  orbitRing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 999, borderColor: colors.border, borderWidth: 1 },
  orbitInner: { position: 'absolute', top: '13%', right: '13%', bottom: '13%', left: '13%', borderRadius: 999, borderColor: colors.selected, borderWidth: 1 },
  orbitHub: { position: 'absolute', top: '50%', left: '50%', width: 58, height: 58, marginTop: -29, marginLeft: -29, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.arcade },
  hubLabel: { color: colors.arcadeViolet, fontSize: 9, fontWeight: '900' },
  hubValue: { color: colors.paper, fontSize: 21, fontWeight: '900', fontVariant: ['tabular-nums'] },
  orbitReadout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
