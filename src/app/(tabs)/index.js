import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Reveal from '../../components/Reveal';
import { formatScore, gameLabels } from '../../format';
import { dailyGame, dayKey, dailyStreak } from '../../progress';
import { getBest, loadDailyProgress } from '../../storage';
import { colors, space, type } from '../../theme';
import { useUser } from '../../user-context';

const modes = [
  { key: 'sudoku', levels: true, title: 'Sudoku', category: 'Logic', glyph: '▦', tone: colors.violet, ink: colors.violetInk },
  { key: 'lights', levels: true, title: 'Lights Out', category: 'Logic', glyph: '⊙', tone: colors.amber, ink: colors.amberInk },
  { key: 'schulte', title: 'Schulte', category: 'Focus', glyph: '01', tone: colors.lime, ink: colors.limeInk },
  { key: 'stroop', title: 'Stroop', category: 'Speed', glyph: 'Aa', tone: colors.peach, ink: colors.peachInk },
];
const difficulties = ['easy', 'medium', 'hard'];

function play(key) {
  const separator = key.indexOf('-');
  router.push(separator > 0
    ? { pathname: `/${key.slice(0, separator)}`, params: { difficulty: key.slice(separator + 1) } }
    : `/${key}`);
}

export default function GamesScreen() {
  const { profile } = useUser();
  const [day, setDay] = useState(dayKey);
  const [daily, setDaily] = useState(null);
  const [bests, setBests] = useState({});
  const [expanded, setExpanded] = useState(null);
  const featured = dailyGame(day);
  const completed = daily?.day === day;
  const recorded = Object.values(bests).filter((value) => value != null).length;

  useEffect(() => {
    const update = () => setDay(dayKey());
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    const timer = setInterval(update, 15_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all(Object.keys(gameLabels).map(async (key) => [key, await getBest(key)]))
      .then(async (entries) => {
        const progress = await loadDailyProgress();
        if (active) { setBests(Object.fromEntries(entries)); setDaily(progress); }
      }).catch(() => {});
    return () => { active = false; };
  }, []));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <View style={styles.logo} accessible={false}><Text style={styles.logoText}>B</Text></View>
            <Text style={styles.wordmark}>Brain Games</Text>
          </View>
          <Button title="Settings" onPress={() => router.push('/settings')} />
        </View>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>Play</Text>
          <Text numberOfLines={1} style={styles.player}>{profile.name}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statNumber}>{dailyStreak(daily, day)}</Text><Text style={styles.statLabel}>Day streak</Text></View>
          <View style={styles.stat}><Text style={styles.statNumber}>{recorded}<Text style={styles.statTotal}> / {Object.keys(gameLabels).length}</Text></Text><Text style={styles.statLabel}>Personal records</Text></View>
        </View>
        <Reveal style={styles.feature}>
          <View style={styles.featureTop}>
            <Text style={styles.featureLabel}>Daily challenge</Text>
            <Text style={styles.featureLabel}>{completed ? '✓ Complete' : 'Today'}</Text>
          </View>
          <Text style={styles.featureTitle}>{gameLabels[featured]}</Text>
          {completed && <Text style={styles.featureDetail}>Today’s best  {formatScore(featured, daily.value)}</Text>}
          <Button primary title={completed ? 'Play again' : 'Play challenge'} onPress={() => play(featured)} style={styles.featureButton} />
        </Reveal>
        <Text accessibilityRole="header" style={styles.section}>All games</Text>
        <View style={styles.catalog}>
          {modes.map((mode) => {
            const hasLevels = mode.levels;
            const open = expanded === mode.key;
            return (
              <View key={mode.key}>
                <Pressable accessibilityRole="button" accessibilityLabel={hasLevels ? `${mode.title} levels` : `Play ${mode.title}`}
                  accessibilityState={hasLevels ? { expanded: open } : undefined}
                  onPress={() => hasLevels ? setExpanded(open ? null : mode.key) : play(mode.key)}
                  style={({ pressed }) => [styles.mode, pressed && styles.pressed]}>
                  <View style={[styles.icon, { backgroundColor: mode.tone }]} accessible={false}>
                    <Text style={[styles.glyph, { color: mode.ink }]}>{mode.glyph}</Text>
                  </View>
                  <View style={styles.modeCopy}>
                    <Text style={styles.modeTitle}>{mode.title}</Text>
                    <Text style={styles.statLabel}>{mode.category}{hasLevels ? '' : ` · Best ${formatScore(mode.key, bests[mode.key])}`}</Text>
                  </View>
                  <Text style={styles.arrow} accessible={false}>{hasLevels ? (open ? '−' : '+') : '›'}</Text>
                </Pressable>
                {open && (
                  <View style={styles.levels}>
                    {difficulties.map((difficulty) => {
                      const key = `${mode.key}-${difficulty}`;
                      return (
                        <Pressable key={key} onPress={() => play(key)} accessibilityRole="button"
                          accessibilityLabel={`${gameLabels[key]}, best ${formatScore(key, bests[key])}`}
                          style={({ pressed }) => [styles.level, pressed && styles.pressed]}>
                          <Text style={styles.levelName}>{difficulty}</Text>
                          <Text style={styles.statLabel}>{formatScore(key, bests[key])}  ›</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { width: '100%', maxWidth: 540, alignSelf: 'center', padding: space.page, gap: space.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  logo: { width: 32, height: 32, backgroundColor: colors.accent, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.paper, fontWeight: '900', fontSize: 18 },
  wordmark: { color: colors.text, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  title: { ...type.display, fontSize: 40, color: colors.text },
  player: { color: colors.muted, flexShrink: 1, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: space.radius, padding: space.md, gap: space.xs },
  statNumber: { ...type.number, fontSize: 23, color: colors.text },
  statTotal: { color: colors.muted, fontSize: 14 },
  statLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  feature: { backgroundColor: colors.tint, borderRadius: space.card, padding: space.page, gap: space.sm },
  featureTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.xs },
  featureLabel: { ...type.label, color: colors.accent },
  featureTitle: { ...type.heading, color: colors.text },
  featureDetail: { color: colors.text, fontWeight: '600' },
  featureButton: { alignSelf: 'flex-start' },
  section: { ...type.heading, fontSize: 23, color: colors.text, marginTop: space.xs },
  catalog: { borderWidth: space.hairline, borderColor: colors.border, borderRadius: space.card, overflow: 'hidden' },
  mode: { minHeight: 70, flexDirection: 'row', gap: space.md, alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: space.hairline, borderBottomColor: colors.border },
  modeCopy: { flex: 1, gap: 2 },
  modeTitle: { fontSize: 17, color: colors.text, fontWeight: '900' },
  icon: { width: 45, height: 45, borderRadius: space.radius, justifyContent: 'center', alignItems: 'center' },
  glyph: { fontSize: 21, fontWeight: '900' },
  arrow: { fontSize: 22, fontWeight: '700', color: colors.muted },
  levels: { backgroundColor: colors.surface, paddingHorizontal: space.md },
  level: { minHeight: space.tap, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: space.hairline, borderBottomColor: colors.border },
  levelName: { fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  pressed: { backgroundColor: colors.tint },
});
