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
import { formatScore, gameLabels } from '../../format';
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

function openGame(key) {
  const separator = key.indexOf('-');
  router.push(separator > 0
    ? { pathname: `/${key.slice(0, separator)}`, params: { difficulty: key.slice(separator + 1) } }
    : `/${key}`);
}

export default function GamesScreen() {
  const { profile } = useUser();
  const { width, fontScale } = useWindowDimensions();
  const compactArt = width < 360 || fontScale >= 1.3;
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
      <ScrollView contentContainerStyle={styles.page}>
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
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.streakIcon}>↗</Text><Text style={styles.statText}>{streak} day streak</Text></View>
          <View style={styles.stat}><Text style={styles.recordIcon}>◆</Text><Text style={styles.statText}>{recorded}/{Object.keys(gameLabels).length} records</Text></View>
        </View>
        <Reveal style={styles.feature}>
          <View style={styles.featureCopy}>
            <Text style={styles.featureLabel}>{completed ? '✓ Daily complete' : 'Daily challenge'}</Text>
            <Text accessibilityRole="header" style={styles.featureTitle}>{gameLabels[featured]}</Text>
            <Button title={completed ? 'Play again' : 'Play challenge'} onPress={() => { play('tap'); setDifficulty({ mode: featuredMode, fixedLevel: featured.split('-')[1] ?? 'easy' }); }} style={styles.featureButton} />
            {completed && <Text style={styles.dailyBest}>Today  {formatScore(featured, daily.value)}</Text>}
          </View>
          <View style={[styles.featureArt, compactArt && styles.compactArt]}>
            <View style={[styles.orbit, compactArt && styles.compactOrbit]} />
            <ArcadeArt game={featuredMode.key} size={compactArt ? 64 : 92} />
            <Text accessible={false} style={styles.spark}>✦</Text>
          </View>
        </Reveal>
        <View style={styles.sectionRow}>
          <Text accessibilityRole="header" style={styles.section}>Game room</Text>
          <Text style={styles.gameCount}>{modes.length} games</Text>
        </View>
        <View style={styles.filters}>
          {categories.map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Filter ${item}`}
              accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)}
              style={[styles.filter, category === item && styles.filterSelected]}>
              <Text style={[styles.filterText, category === item && styles.filterSelectedText]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.catalog}>
          {modes.filter((mode) => category === 'All' || mode.category === category).map((mode) => (
            <Pressable key={mode.key} accessibilityRole="button"
              accessibilityLabel={mode.levels ? `${mode.title} levels` : `Play ${mode.title}`}
              onPress={() => { play('tap'); setDifficulty({ mode, fixedLevel: null }); }}
              style={({ pressed }) => [styles.mode, mode.key === 'stroop' && styles.wideMode, pressed && styles.pressed, pressed && animate && styles.compress]}>
              <View style={[styles.modeArt, mode.key === 'stroop' && styles.wideArt, { backgroundColor: mode.tone }]}>
                <ArcadeArt game={mode.key} size={54} card />
              </View>
              <View style={styles.modeCopy}>
                <Text style={styles.modeTitle}>{mode.title}</Text>
                <Text style={styles.modeDetail}>{mode.levels ? '3 difficulties' : bests[mode.key] == null ? mode.category : `Best ${formatScore(mode.key, bests[mode.key])}`}</Text>
              </View>
              <Text style={[styles.arrow, mode.key === 'stroop' && styles.wideArrow]} accessible={false}>↗</Text>
            </Pressable>
          ))}
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
  page: { width: '100%', maxWidth: 540, alignSelf: 'center', padding: space.page, gap: space.sm },
  top: { minHeight: space.tap, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, flexBasis: 0, flexGrow: 1 },
  wordmark: { color: colors.arcade, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  profile: { minHeight: space.tap, maxWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.sm },
  player: { color: colors.muted, flexShrink: 1, fontWeight: '700' },
  profilePressed: { opacity: 0.65 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: space.radius, paddingVertical: space.sm, paddingHorizontal: space.md },
  statText: { color: colors.arcade, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  streakIcon: { color: colors.accent, fontWeight: '900', fontSize: 16 },
  recordIcon: { color: colors.violetInk, fontWeight: '900', fontSize: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.sm, overflow: 'hidden', backgroundColor: colors.arcade, borderRadius: space.card, marginTop: space.xs, padding: space.page },
  featureCopy: { flex: 1, gap: space.sm },
  featureLabel: { ...type.label, color: colors.arcadeLime, letterSpacing: 1.15 },
  featureTitle: { ...type.heading, color: colors.paper, fontSize: 30 },
  featureButton: { alignSelf: 'flex-start', backgroundColor: colors.arcadeLime, borderColor: colors.arcadeLime, paddingHorizontal: space.sm },
  dailyBest: { color: colors.arcadeWhite, fontSize: 12, fontWeight: '700' },
  featureArt: { width: 102, minHeight: 106, alignItems: 'center', justifyContent: 'center' },
  compactArt: { width: 72, minHeight: 78 },
  orbit: { position: 'absolute', width: 135, height: 135, borderRadius: 68, borderWidth: space.line, borderColor: colors.arcadeLine },
  compactOrbit: { width: 92, height: 92, borderRadius: 46 },
  spark: { position: 'absolute', top: 0, right: 0, color: colors.arcadeLime, fontSize: 24, textShadowColor: colors.arcade, textShadowRadius: 3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.sm },
  section: { ...type.heading, fontSize: 24, color: colors.arcade },
  gameCount: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  filter: { minHeight: 44, paddingHorizontal: space.sm, borderRadius: space.radius, borderWidth: space.hairline, borderColor: colors.border, justifyContent: 'center' },
  filterSelected: { backgroundColor: colors.arcade, borderColor: colors.arcade },
  filterText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  filterSelectedText: { color: colors.paper },
  catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  mode: { width: '48%', borderRadius: space.radius, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: space.hairline, borderColor: colors.border },
  wideMode: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  modeArt: { height: 67, alignItems: 'center', justifyContent: 'center' },
  wideArt: { width: '43%' },
  modeCopy: { paddingHorizontal: space.sm, paddingVertical: space.sm, gap: 2 },
  modeTitle: { fontWeight: '900', fontSize: 15, color: colors.arcade },
  modeDetail: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  arrow: { position: 'absolute', right: space.sm, top: space.xs, color: colors.arcade, fontSize: 17, fontWeight: '900' },
  wideArrow: { top: space.sm },
  pressed: { opacity: 0.74 },
  compress: { transform: [{ scale: motion.press }] },
});
