import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import BrandMark from '../../components/BrandMark';
import ArcadeArt from '../../components/ArcadeArt';
import Button from '../../components/Button';
import DifficultyPicker from '../../components/DifficultyPicker';
import Reveal from '../../components/Reveal';
import { useFeedback } from '../../feedback';
import { levelKey, levels } from '../../difficulty';
import { formatScore, gameLabels, scoreUnit } from '../../format';
import { dailyGame, dayKey, dailyStreak } from '../../progress';
import { getBest, loadDailyProgress } from '../../storage';
import { colors, motion, space, type } from '../../theme';
import { useUser } from '../../user-context';

const modes = [
  { key: 'sudoku', levels: true, title: 'Sudoku', category: 'Logic', tone: colors.arcadeViolet },
  { key: 'lights', levels: true, title: 'Lights Out', category: 'Logic', tone: colors.arcadeAmber },
  { key: 'schulte', levels: true, title: 'Schulte', category: 'Focus', tone: colors.arcadeLime },
  { key: 'sequence', levels: true, title: 'Sequence Memory', category: 'Memory', tone: colors.arcadeBlue },
  { key: 'stroop', title: 'Stroop', category: 'Speed', tone: colors.arcadePink },
];
const categories = ['All', 'Logic', 'Focus', 'Memory', 'Speed'];
const hardestFirst = [...levels].reverse();

function openGame(key) {
  const separator = key.indexOf('-');
  router.push(separator > 0
    ? { pathname: `/${key.slice(0, separator)}`, params: { difficulty: key.slice(separator + 1) } }
    : `/${key}`);
}

export default function GamesScreen() {
  const { profile } = useUser();
  const { width, fontScale } = useWindowDimensions();
  const compactArt = width < 375 || fontScale >= 1.3;
  const wide = width >= 840 && fontScale < 1.3;
  const { play, animate } = useFeedback();
  const [day, setDay] = useState(dayKey);
  const [daily, setDaily] = useState(null);
  const [bests, setBests] = useState({});
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState(null);
  const featured = dailyGame(day);
  const featuredMode = modes.find((mode) => mode.key === featured.split('-')[0]);
  const completed = daily?.day === day;
  const recorded = Object.values(bests).filter((value) => value != null).length;
  const streak = dailyStreak(daily, day);

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

  function launch(key) {
    play('tap');
    setDifficulty(null);
    openGame(key);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.page, wide && styles.widePage]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <BrandMark />
            <Text style={styles.wordmark}>Brain Twist</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.profile, pressed && styles.profilePressed]}>
            <Text numberOfLines={1} style={styles.player}>{profile.name}</Text>
            <Avatar id={profile.avatarId} size={34} />
          </Pressable>
        </View>
        <View style={[styles.lobby, wide && styles.wideLobby]}>
          <View style={[styles.dailyColumn, wide && styles.sidebar]}>
            <Reveal style={styles.feature}>
              <View style={styles.featureCopy}>
                <Text style={styles.featureLabel}>{completed ? '✓  Daily complete' : 'Daily challenge'}</Text>
                <Text accessibilityRole="header" style={styles.featureTitle}>{gameLabels[featured]}</Text>
                {completed && <Text style={styles.dailyBest}>Today’s best · {formatScore(featured, daily.value)}</Text>}
                <Button title={completed ? 'Play again' : 'Play challenge'} onPress={() => { play('tap'); setDifficulty({ mode: featuredMode, fixedLevel: featured.split('-')[1] ?? 'easy' }); }} style={styles.featureButton} />
              </View>
              <View style={[styles.featureArt, compactArt && styles.compactArt]}>
                <View style={[styles.orbit, compactArt && styles.compactOrbit]} />
                <View style={[styles.orbit, styles.orbitInner, compactArt && styles.compactInner]} />
                <ArcadeArt game={featuredMode.key} size={compactArt ? 64 : 92} />
                <Text accessible={false} style={styles.spark}>✦</Text>
              </View>
            </Reveal>
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statNumber}>{streak}</Text><Text style={styles.statText}>Daily streak</Text></View>
              <View style={styles.stat}><Text style={styles.statNumber}>{recorded}<Text style={styles.statTotal}>/{Object.keys(gameLabels).length}</Text></Text><Text style={styles.statText}>Personal records</Text></View>
            </View>
          </View>
          <View style={styles.gamesColumn}>
            <Text accessibilityRole="header" style={styles.section}>Game room</Text>
            <View style={styles.filters}>
              {categories.map((item) => (
                <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Filter ${item}`}
                  accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)}
                  style={[styles.filter, width < 360 && styles.compactFilter, category === item && styles.filterSelected]}>
                  <Text style={[styles.filterText, category === item && styles.filterSelectedText]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.catalog}>
              {modes.filter((mode) => category === 'All' || mode.category === category).map((mode) => {
                const recordLevel = mode.levels ? hardestFirst.find((level) => bests[levelKey(mode.key, level)] != null) : null;
                const recordKey = levelKey(mode.key, recordLevel ?? 'easy');
                const value = bests[recordKey];
                const unit = scoreUnit(recordKey);
                const record = value == null ? null : `${formatScore(recordKey, value)}${unit === 'time' ? '' : ` ${unit === 'points' ? 'pts' : unit}`}`;
                const label = mode.levels ? `${mode.title} levels` : `Play ${mode.title}`;
                return (
                  <Pressable key={mode.key} accessibilityRole="button"
                    accessibilityLabel={label} accessibilityHint={record ? `Personal best ${record}${recordLevel ? ` on ${recordLevel}` : ''}` : undefined}
                    onPress={() => { play('tap'); setDifficulty({ mode, fixedLevel: null }); }}
                    style={({ pressed }) => [styles.mode, pressed && styles.pressed, pressed && animate && styles.compress]}>
                    <View accessible={false} style={[styles.modeArt, { backgroundColor: mode.tone }]}>
                      <ArcadeArt game={mode.key} size={39} card />
                    </View>
                    <View style={styles.modeCopy}>
                      <Text style={styles.modeTitle}>{mode.title}</Text>
                      <Text style={styles.modeDetail}>{mode.category}{mode.levels ? ' · 3 levels' : ' · 30 sec'}</Text>
                      {record && fontScale >= 1.3 && <Text style={styles.modeDetail}>Best{recordLevel ? ` · ${recordLevel}` : ''} · {record}</Text>}
                    </View>
                    {record && fontScale < 1.3 && <View style={styles.record} accessible={false}>
                      <Text style={styles.recordValue}>{record}</Text>
                      <Text style={styles.modeDetail}>{recordLevel ? `Best · ${recordLevel}` : 'Best'}</Text>
                    </View>}
                    <Text style={styles.arrow} accessible={false}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
      {difficulty && (
        <DifficultyPicker mode={difficulty.mode} fixedLevel={difficulty.fixedLevel} bests={bests}
          onClose={() => setDifficulty(null)} onContinue={launch} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { width: '100%', maxWidth: 580, alignSelf: 'center', padding: space.page, gap: space.md },
  widePage: { maxWidth: 980, paddingHorizontal: space.xl },
  lobby: { gap: space.md },
  wideLobby: { flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' },
  dailyColumn: { gap: space.md },
  sidebar: { width: '39%' },
  gamesColumn: { flex: 1, minWidth: 0, gap: space.md },
  top: { minHeight: space.tap, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, flexBasis: 0, flexGrow: 1 },
  wordmark: { color: colors.arcade, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  profile: { minHeight: space.tap, maxWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.sm },
  player: { color: colors.muted, flexShrink: 1, fontWeight: '700' },
  profilePressed: { opacity: 0.65 },
  stats: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stat: { flex: 1, paddingVertical: space.xs, paddingBottom: space.md },
  statText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  statNumber: { color: colors.arcade, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statTotal: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.sm, overflow: 'hidden', backgroundColor: colors.arcade, borderRadius: space.card, padding: space.page },
  featureCopy: { flex: 1, gap: space.sm },
  featureLabel: { ...type.label, color: colors.arcadeLime, letterSpacing: 1.15 },
  featureTitle: { ...type.heading, color: colors.paper, fontSize: 30 },
  featureButton: { alignSelf: 'flex-start', backgroundColor: colors.arcadeLime, borderColor: colors.arcadeLime, paddingHorizontal: space.sm },
  dailyBest: { color: colors.arcadeWhite, fontSize: 12, fontWeight: '700' },
  featureArt: { width: 102, minHeight: 106, alignItems: 'center', justifyContent: 'center' },
  compactArt: { width: 72, minHeight: 78 },
  orbit: { position: 'absolute', width: 135, height: 135, borderRadius: 68, borderWidth: space.line, borderColor: colors.arcadeLine },
  compactOrbit: { width: 92, height: 92, borderRadius: 46 },
  orbitInner: { width: 112, height: 112, borderRadius: 56 },
  compactInner: { width: 72, height: 72, borderRadius: 36 },
  spark: { position: 'absolute', top: 0, right: 0, color: colors.arcadeLime, fontSize: 24, textShadowColor: colors.arcade, textShadowRadius: 3 },
  section: { ...type.heading, fontSize: 24, color: colors.arcade },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  filter: { minHeight: 44, paddingHorizontal: space.md, borderRadius: 22, justifyContent: 'center' },
  compactFilter: { paddingHorizontal: space.sm },
  filterSelected: { backgroundColor: colors.violet },
  filterText: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  filterSelectedText: { color: colors.violetInk },
  catalog: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  mode: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 67, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  modeArt: { width: 49, height: 49, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center' },
  modeCopy: { flex: 1, minWidth: 0, gap: 2 },
  modeTitle: { fontWeight: '900', fontSize: 16, color: colors.arcade },
  modeDetail: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  record: { alignItems: 'flex-end', maxWidth: '35%' },
  recordValue: { color: colors.arcade, fontWeight: '900', fontVariant: ['tabular-nums'] },
  arrow: { color: colors.violetInk, fontSize: 24, fontWeight: '700' },
  pressed: { opacity: 0.74 },
  compress: { transform: [{ scale: motion.press }] },
});
