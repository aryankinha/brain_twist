// Three throwaway leaderboard layouts on /leaderboard, switchable with ?variant=A, B, or C.
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Avatar from './Avatar';
import Reveal from './Reveal';
import { colors, space, type } from '../theme';

export const prototypeNames = { A: 'Arena', B: 'Trophy Hall', C: 'Score Sheet' };
const places = [2, 1, 3];
const metals = {
  1: [colors.amber, colors.arcadeAmber, colors.amberInk],
  2: [colors.sky, colors.arcadeBlue, colors.skyInk],
  3: [colors.peach, colors.arcadePink, colors.peachInk],
};

function Trophy({ size = 82 }) {
  return (
    <View accessible={false} style={[styles.trophy, { width: size, height: size * 0.85 }]}>
      <View style={styles.handles} />
      <View style={styles.trophyStem} />
      <View style={styles.trophyFoot} />
      <View style={styles.cup}>
        <View style={styles.cupShine} />
        <View style={styles.cupGem} />
      </View>
      <View style={styles.cupRim} />
    </View>
  );
}

function Medal({ rank }) {
  const [fill, ribbon, ink] = metals[rank];
  return (
    <View style={styles.medal}>
      <View style={[styles.medalRibbon, { backgroundColor: ribbon }]} />
      <View style={[styles.medalFace, { backgroundColor: fill, borderColor: ribbon }]}>
        <Text style={[styles.medalNumber, { color: ink }]}>{rank}</Text>
      </View>
    </View>
  );
}

function Title({ title, hint, dark = false, left = false }) {
  return (
    <View style={[styles.titleGroup, left && styles.alignLeft]}>
      <Text style={[styles.eyebrow, dark && styles.neon]}>Brain Twist Ranked</Text>
      <Text accessibilityRole="header" style={[styles.title, dark && styles.white, left && styles.textLeft]}>{title}</Text>
      <Text style={[styles.hint, dark && styles.softWhite, left && styles.textLeft]}>{hint}</Text>
    </View>
  );
}

function Winner({ model, rank, layout, trophy = false }) {
  const player = model.entries[rank - 1];
  const arena = layout === 'arena';
  const sheet = layout === 'sheet';
  const champion = layout === 'champion';
  const [fill, ribbon, ink] = metals[rank];
  const playerStyle = [
    arena ? styles.step : styles.winnerLine,
    arena && { backgroundColor: fill, minHeight: { 1: 150, 2: 132, 3: 120 }[rank] },
    sheet && styles.runner,
    champion && styles.champion,
  ];
  const medal = <Medal rank={rank} />;
  if (!player) {
    return <View style={[...playerStyle, styles.openPlace]}>
      {medal}
      <Text style={styles.hint}>Unclaimed</Text>
      {trophy && <Trophy size={64} />}
    </View>;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={model.label(player)} onPress={() => model.onPlayer(player)}
      style={({ pressed }) => [...playerStyle, pressed && styles.pressed]}>
      {medal}
      <Avatar id={player.isYou ? model.ownAvatar : player.avatarId} size={champion ? 54 : rank === 1 ? 42 : 34} />
      <View style={arena ? styles.stepName : styles.winnerText}>
        <Text numberOfLines={1} style={[styles.winnerName, arena && styles.center, champion && styles.championName]}>{player.name}{player.isYou ? ' (you)' : ''}</Text>
        <Text numberOfLines={1} style={[styles.winnerScore, { color: ink }, champion && styles.championScore]}>
          {model.value(player)}
        </Text>
      </View>
      <View style={arena ? styles.stepMovement : [styles.lineMovement, champion && { borderColor: ribbon }]}>
        {model.movement(player.movement)}
      </View>
      {trophy && <Trophy size={64} />}
    </Pressable>
  );
}

export function VariantA({ model, controls, status, listBar }) {
  return (
    <>
      {controls}
      <Reveal>
        <View style={styles.arena}>
          <Trophy size={78} />
          <Title title={model.title} hint={model.hint} dark />
          <View style={styles.steps}>
            {places.map((rank) => <Winner key={rank} rank={rank} model={model} layout="arena" />)}
          </View>
        </View>
      </Reveal>
      {status}
      {listBar}
    </>
  );
}

export function VariantB({ model, controls, status, listBar }) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  return (
    <>
      <Reveal>
        <View style={[styles.hall, wide && styles.hallWide]}>
          <View style={[styles.hallTitle, wide ? styles.hallTitleWide : styles.hallTitleCompact]}>
            <View style={styles.hallTrophy}><Trophy size={wide ? 104 : 70} /></View>
            <Title title={model.title} hint={model.hint} left={!wide} />
          </View>
          <View style={styles.hallBoard}>
            <Text style={styles.eyebrow}>Championship podium</Text>
            {[1, 2, 3].map((rank) => <Winner key={rank} rank={rank} model={model} layout="hall" />)}
          </View>
        </View>
      </Reveal>
      {controls}
      {status}
      {listBar}
    </>
  );
}

export function VariantC({ model, controls, status, listBar }) {
  return (
    <>
      <View style={styles.sheetHeading}>
        <Title title={model.title} hint={model.hint} left />
      </View>
      {controls}
      <Reveal>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>First place</Text>
          <Winner rank={1} model={model} layout="champion" trophy />
          <View style={styles.runners}>
            <Winner rank={2} model={model} layout="sheet" />
            <Winner rank={3} model={model} layout="sheet" />
          </View>
        </View>
      </Reveal>
      {status}
      {listBar}
    </>
  );
}

const styles = StyleSheet.create({
  trophy: { alignSelf: 'center', flexShrink: 0 },
  handles: { position: 'absolute', left: '8%', right: '8%', top: '18%', height: '37%', borderWidth: 4, borderColor: colors.arcadeAmber, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  cup: { position: 'absolute', left: '22%', right: '22%', top: '9%', height: '55%', backgroundColor: colors.arcadeAmber, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderRightWidth: 5, borderRightColor: colors.amberInk, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cupRim: { position: 'absolute', left: '18%', right: '18%', top: '5%', height: '8%', borderRadius: 4, backgroundColor: colors.amber },
  cupShine: { position: 'absolute', left: '16%', top: 0, bottom: '30%', width: 3, backgroundColor: colors.amber, borderRadius: 2 },
  cupGem: { width: '23%', aspectRatio: 1, transform: [{ rotate: '45deg' }], backgroundColor: colors.amberInk },
  trophyStem: { position: 'absolute', left: '44%', right: '44%', top: '58%', height: '23%', backgroundColor: colors.arcadeAmber },
  trophyFoot: { position: 'absolute', left: '27%', right: '27%', bottom: '9%', height: '12%', borderRadius: 3, backgroundColor: colors.arcadeAmber, borderBottomWidth: 3, borderBottomColor: colors.amberInk },
  medal: { height: 30, width: 26, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 },
  medalRibbon: { position: 'absolute', top: 0, height: 17, width: 12, transform: [{ rotate: '12deg' }] },
  medalFace: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  medalNumber: { fontSize: 11, fontWeight: '900' },
  titleGroup: { gap: space.xs, flexShrink: 1, alignItems: 'center' },
  alignLeft: { alignItems: 'flex-start' },
  textLeft: { textAlign: 'left' },
  eyebrow: { ...type.label, color: colors.accent },
  title: { ...type.heading, color: colors.arcade, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  neon: { color: colors.arcadeLime },
  white: { color: colors.paper },
  softWhite: { color: colors.arcadeWhite },
  arena: { backgroundColor: colors.arcade, borderTopLeftRadius: space.card, borderTopRightRadius: space.card, paddingHorizontal: space.sm, paddingTop: space.md, gap: space.md, alignItems: 'center' },
  steps: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.xs, width: '100%', maxWidth: 540 },
  step: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', padding: space.xs, gap: space.xs, borderTopLeftRadius: space.radius, borderTopRightRadius: space.radius },
  center: { textAlign: 'center' },
  stepName: { alignItems: 'center', width: '100%', gap: 2 },
  stepMovement: { marginBottom: space.xs },
  hall: { paddingTop: space.sm, paddingBottom: space.md, gap: space.md },
  hallWide: { flexDirection: 'row', alignItems: 'stretch', gap: space.xl },
  hallTitle: { gap: space.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet, padding: space.md },
  hallTitleWide: { width: '38%' },
  hallTitleCompact: { flexDirection: 'row', justifyContent: 'flex-start', gap: space.md },
  hallTrophy: { alignItems: 'center', justifyContent: 'center' },
  hallBoard: { flex: 1, paddingTop: space.sm },
  winnerLine: { flexDirection: 'row', alignItems: 'center', minHeight: space.tap + space.sm, gap: space.sm, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  winnerText: { flex: 1, minWidth: 0, gap: 2 },
  winnerName: { width: '100%', fontSize: 15, fontWeight: '900', color: colors.arcade },
  winnerScore: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  lineMovement: { flexShrink: 0 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm, gap: space.sm },
  sheet: { borderTopWidth: space.line, borderBottomWidth: space.line, borderColor: colors.arcade, paddingTop: space.md },
  champion: { backgroundColor: colors.amber, paddingHorizontal: space.sm, paddingVertical: space.md, marginTop: space.xs, borderBottomWidth: 0 },
  championName: { fontSize: 21 },
  championScore: { fontSize: 16 },
  runners: { flexDirection: 'row', gap: space.sm },
  runner: { flex: 1, minWidth: 0, flexWrap: 'wrap', borderBottomWidth: 0, gap: space.xs },
  openPlace: { justifyContent: 'center', gap: space.xs },
  pressed: { opacity: 0.7 },
});
