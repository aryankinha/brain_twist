import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Reveal from '../../components/Reveal';
import { formatScore, gameLabels } from '../../format';
import { dailyGame, dayKey } from '../../progress';
import { getBest, loadDaily } from '../../storage';
import { colors, space, type } from '../../theme';
import { useUser } from '../../user-context';

function openGame(key) {
  router.push(key.startsWith('sudoku-')
    ? { pathname: '/sudoku', params: { difficulty: key.slice(7) } }
    : `/${key}`);
}

const sudoku = ['sudoku-easy', 'sudoku-medium', 'sudoku-hard'];
const quickGames = [
  { key: 'schulte', title: 'Schulte', tag: 'Find 1–25', art: '01', style: 'schulte' },
  { key: 'stroop', title: 'Stroop', tag: 'Match the ink', art: 'Aa', style: 'stroop' },
];

export default function GamesScreen() {
  const { profile } = useUser();
  const [day, setDay] = useState(dayKey);
  const [daily, setDaily] = useState(null);
  const [bests, setBests] = useState({});
  const featured = dailyGame(day);
  const completed = daily?.day === day && daily.value != null;
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
        const value = await loadDaily(day);
        if (active) { setBests(Object.fromEntries(entries)); setDaily({ day, value }); }
      }).catch(() => {});
    return () => { active = false; };
  }, [day]));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>BRAIN / GAMES</Text>
          <Button title="Settings" onPress={() => router.push('/settings')} />
        </View>
        <View style={styles.greeting}>
          <Text accessibilityRole="header" style={styles.title}>Ready, {profile.name}?</Text>
          <Text style={styles.muted}>{recorded} / 5 personal records set</Text>
        </View>
        <Reveal style={styles.feature}>
          <View style={styles.featureTop}>
            <Text style={styles.featureLabel}>DAILY CHALLENGE</Text>
            <Text style={styles.marker}>{completed ? '✓ COMPLETE' : 'OPEN'}</Text>
          </View>
          <View style={styles.featureTitleRow}>
            <Text style={styles.featureTitle}>{gameLabels[featured]}</Text>
            <View style={styles.dial} accessible={false}><View style={styles.dialCore} /></View>
          </View>
          {completed && <Text style={styles.featureLabel}>TODAY’S BEST  {formatScore(featured, daily.value)}</Text>}
          <Button title={completed ? 'Play again' : 'Play challenge'} onPress={() => openGame(featured)} style={styles.featureButton} />
        </Reveal>
        <Text accessibilityRole="header" style={styles.section}>Choose your game</Text>
        <View style={styles.logic}>
          <View style={styles.logicHeader}>
            <View><Text style={styles.logicTitle}>Sudoku</Text><Text style={styles.logicCaption}>9 × 9  /  LOGIC</Text></View>
            <Text style={styles.logicArt} accessible={false}>▦</Text>
          </View>
          {sudoku.map((key) => (
            <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${gameLabels[key]}, best ${formatScore(key, bests[key])}`}
              onPress={() => openGame(key)} style={({ pressed }) => [styles.difficulty, pressed && styles.pressed]}>
              <Text style={styles.difficultyName}>{key.slice(7)}</Text>
              <Text style={styles.logicBest}>{formatScore(key, bests[key])}   →</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.quickGames}>
          {quickGames.map((game) => (
            <Pressable key={game.key} accessibilityRole="button" accessibilityLabel={`Play ${game.title}, best ${formatScore(game.key, bests[game.key])}`}
              onPress={() => openGame(game.key)} style={({ pressed }) => [styles.quickGame, styles[game.style], pressed && styles.pressed]}>
              <Text accessible={false} style={styles.art}>{game.art}</Text>
              <Text style={styles.quickTitle}>{game.title}  →</Text>
              <Text style={styles.quickDescription}>{game.tag}</Text>
              <Text style={styles.quickBest}>Best {formatScore(game.key, bests[game.key])}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { width: '100%', maxWidth: 540, alignSelf: 'center', padding: space.page, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, borderBottomWidth: space.line, borderBottomColor: colors.text, paddingBottom: space.sm },
  wordmark: { ...type.label, fontSize: 14, color: colors.text, flexShrink: 1 },
  greeting: { gap: space.xs },
  title: { ...type.heading, color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  feature: { backgroundColor: colors.hero, borderRadius: space.card, padding: space.page, gap: space.sm },
  featureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  featureLabel: { ...type.label, color: colors.heroText },
  marker: { ...type.label, letterSpacing: 0.8, color: colors.lime },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  featureTitle: { ...type.heading, color: colors.paper, flex: 1 },
  dial: { width: 46, height: 46, borderWidth: space.hairline, borderColor: colors.lime, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  dialCore: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.lime },
  featureButton: { backgroundColor: colors.lime, borderColor: colors.lime, alignSelf: 'flex-start' },
  section: { ...type.label, color: colors.text, marginTop: space.sm },
  logic: { backgroundColor: colors.tint, borderWidth: space.hairline, borderColor: colors.selected, paddingHorizontal: space.md, borderRadius: space.radius },
  logicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  logicTitle: { ...type.heading, fontSize: 25, color: colors.accent },
  logicCaption: { ...type.label, color: colors.accent },
  logicArt: { color: colors.accent, fontSize: 34 },
  difficulty: { minHeight: space.tap, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: space.hairline, borderTopColor: colors.selected, gap: space.sm },
  difficultyName: { fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  logicBest: { color: colors.accent, fontWeight: '700', fontVariant: ['tabular-nums'] },
  quickGames: { flexDirection: 'row', gap: space.sm },
  quickGame: { flex: 1, padding: space.md, gap: space.xs, borderRadius: space.radius },
  schulte: { backgroundColor: colors.lime },
  stroop: { backgroundColor: colors.peach },
  art: { ...type.display, fontSize: 37, color: colors.text },
  quickTitle: { fontWeight: '900', fontSize: 19, color: colors.text },
  quickBest: { ...type.label, letterSpacing: 0.5, color: colors.text },
  quickDescription: { color: colors.text, fontSize: 13 },
  pressed: { opacity: 0.76 },
});
