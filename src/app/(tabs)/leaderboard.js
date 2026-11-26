import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { prototypeNames, VariantA, VariantB, VariantC } from '../../components/LeaderboardPrototype';
import LeaderboardProfile from '../../components/LeaderboardProfile';
import Reveal from '../../components/Reveal';
import PrototypeSwitcher from '../../components/PrototypeSwitcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import { readStandings, refreshStandings } from '../../leaderboard-cache';
import { levelKey, levels } from '../../difficulty';
import { formatScore, gameLabels, scoreUnit } from '../../format';
import { colors, space, type } from '../../theme';
import { useUser } from '../../user-context';

const tabs = [
  ['overall', 'Overall'], ['sudoku', 'Sudoku'], ['lights', 'Lights Out'], ['schulte', 'Schulte'],
  ['sequence', 'Sequence Memory'], ['stroop', 'Stroop'],
];
const periods = [
  ['day', 'Daily', 'Resets at midnight UTC · compared with yesterday'],
  ['week', 'Weekly', 'Resets Monday UTC · compared with last week'],
  ['all', 'All time', 'Movement since Monday UTC'],
];
const defaultData = { entries: [], you: null, ranked: 0, endsAt: null };
const medals = [colors.amber, colors.sky, colors.peach];
const maxWidth = 850;
const variants = { A: VariantA, B: VariantB, C: VariantC };

function changeVariant(variant) {
  router.setParams({ variant });
}

function resultLabel(entry, game) {
  return game === 'overall' ? `${entry.total} pts` : formatScore(game, entry.value);
}

function playerLabel(entry, game) {
  const movement = entry.movement == null ? 'no previous rank' : entry.movement === 0
    ? 'rank unchanged' : `${entry.movement > 0 ? 'up' : 'down'} ${Math.abs(entry.movement)} places`;
  return `Open ${entry.name}, rank ${entry.rank}, ${resultLabel(entry, game)}, ${movement}`;
}

function Movement({ amount }) {
  if (amount === null || amount === undefined) return <Text style={styles.muted} accessibilityLabel="No previous rank">—</Text>;
  if (amount === 0) return <Text style={styles.muted} accessibilityLabel="Rank unchanged">—</Text>;
  const direction = amount > 0 ? 'up' : 'down';
  return <Text style={amount > 0 ? styles.up : styles.down}
    accessibilityLabel={`${direction} ${Math.abs(amount)} places`}>{amount > 0 ? '↑' : '↓'} {Math.abs(amount)}</Text>;
}

function Podium({ entries, game, ownAvatar, onPlayer }) {
  const top = entries.slice(0, 3);
  if (top.length > 1) [top[0], top[1]] = [top[1], top[0]];
  if (!top.length) return null;
  return (
    <Reveal style={styles.podium}>
      {top.map((entry) => (
        <Pressable key={entry.key} accessibilityRole="button" accessibilityLabel={playerLabel(entry, game)}
          onPress={() => onPlayer(entry)} style={({ pressed }) => [
            styles.podiumPlayer, { backgroundColor: medals[entry.rank - 1] }, entry.rank === 1 && styles.winner, pressed && styles.pressed,
          ]}>
          <Text style={styles.podiumRank}>#{entry.rank}</Text>
          <Avatar id={entry.isYou ? ownAvatar : entry.avatarId} size={entry.rank === 1 ? 51 : 42} />
          <Text numberOfLines={1} style={styles.podiumName}>{entry.name}{entry.isYou ? ' (you)' : ''}</Text>
          <Text style={styles.podiumValue}>{resultLabel(entry, game)}</Text>
          <Movement amount={entry.movement} />
        </Pressable>
      ))}
    </Reveal>
  );
}

export default function LeaderboardScreen() {
  const { profile } = useUser();
  const { variant } = useLocalSearchParams();
  const variantKey = typeof variant === 'string' && Object.hasOwn(variants, variant) ? variant : 'A';
  const Prototype = __DEV__ ? variants[variantKey] : null;
  const { userId, avatarId } = profile;
  const [game, setGame] = useState('overall');
  const [period, setPeriod] = useState('week');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const requestId = useRef(0);
  const group = game.split('-')[0];
  const overall = game === 'overall';
  const key = `${game}/${period}`;
  const data = snapshot?.key === key ? snapshot.data : defaultData;
  const hasData = snapshot?.key === key;
  const title = overall ? 'Overall standings' : gameLabels[game];
  const [, periodLabel, periodHint] = periods.find(([id]) => id === period);
  const previousPeriod = hasData && snapshot.previousPeriod;
  const closePeriod = () => setPeriodOpen(false);

  const load = useCallback(async (force = false) => {
    const id = ++requestId.current;
    setFailure(null);
    try {
      const saved = await readStandings(game, userId, period);
      if (id !== requestId.current) return;
      if (saved) {
        setSnapshot({ ...saved, key, previousPeriod: saved.data.endsAt != null && saved.data.endsAt <= Date.now() });
        setLoading(false);
      }
      const next = await refreshStandings(game, userId, period, saved, force);
      if (id === requestId.current) setSnapshot({ ...next, key, previousPeriod: next.data.endsAt != null && next.data.endsAt <= Date.now() });
    } catch (error) {
      if (id === requestId.current) setFailure(error.name === 'TypeError' ? 'offline' : 'error');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [game, key, period, userId]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { ++requestId.current; };
  }, [load]));

  const endsAt = data.endsAt;
  useFocusEffect(useCallback(() => {
    if (endsAt == null || endsAt <= Date.now()) return;
    const timer = setTimeout(() => load(), endsAt - Date.now());
    return () => clearTimeout(timer);
  }, [endsAt, load]));

  function changeFilter(set, next, current) {
    if (next === current) return;
    setLoading(true);
    setRefreshing(false);
    setFailure(null);
    set(next);
  }

  const boardHint = overall
    ? 'Each game has equal weight.'
    : { points: 'Highest score wins', rounds: 'Most rounds wins', moves: 'Fewest moves wins', time: 'Fastest time wins' }[scoreUnit(game)];

  const controls = (
    <>
      <View style={styles.periodRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ranking period: ${periodLabel}`}
          accessibilityState={{ expanded: periodOpen }} onPress={() => setPeriodOpen(true)}
          style={({ pressed }) => [styles.periodTrigger, pressed && styles.pressed]}>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <View style={styles.chevron} />
        </Pressable>
        <Text style={styles.periodInfo}>{previousPeriod ? 'Showing the previous period' : periodHint}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {tabs.map(([id, name]) => (
          <Button key={id} title={name} selected={id === group}
            onPress={() => { if (id !== group) changeFilter(setGame, id === 'overall' ? id : levelKey(id, 'easy'), game); }} />
        ))}
      </ScrollView>
      {!overall && group !== 'stroop' && <View style={styles.levels}>
        {levels.map((level) => <Button key={level} title={level[0].toUpperCase() + level.slice(1)}
          selected={game === levelKey(group, level)} style={styles.filter}
          onPress={() => changeFilter(setGame, levelKey(group, level), game)} />)}
      </View>}
    </>
  );
  const status = (
    <>
      {loading && !refreshing && <ActivityIndicator style={styles.message} color={colors.accent} accessibilityLabel="Loading standings" />}
      {failure && <View style={styles.message}>
        <Text style={styles.muted}>{failure === 'offline' ? 'Connection unavailable.' : 'Could not load standings.'} {hasData ? 'Showing the last loaded standings.' : ''}</Text>
        <Button title="Retry" onPress={() => load(true)} />
      </View>}
      {!loading && !failure && !previousPeriod && !data.entries.length && <View style={styles.message}>
        <Text accessibilityRole="header" style={styles.section}>No ranked scores yet</Text>
        <Text style={styles.muted}>Finish a round to enter this board.</Text>
        <Button primary title={overall ? 'Explore games' : `Play ${title}`} onPress={() => {
          if (overall) router.navigate('/');
          else router.push({ pathname: `/${group}`, params: { difficulty: game.split('-')[1] ?? 'easy' } });
        }} />
      </View>}
    </>
  );
  const listBar = data.entries.length > 3
    ? <Text accessibilityRole="header" style={styles.section}>Standings</Text> : null;
  const model = {
    title, hint: boardHint, entries: data.entries, ownAvatar: avatarId, onPlayer: setPlayer,
    label: (entry) => playerLabel(entry, game),
    value: (entry) => resultLabel(entry, game),
    movement: (amount) => <Movement amount={amount} />,
  };

  return (
    <View style={[styles.screen, Prototype && styles.prototypeShelf]}>
      <FlatList
        contentContainerStyle={styles.list}
        data={data.entries.slice(3)}
        keyExtractor={(entry) => entry.key}
        ListHeaderComponent={Prototype
          ? <Prototype key={variantKey} model={model} controls={controls} status={status} listBar={listBar} />
          : <>
            <View style={styles.banner}>
              <Text style={styles.bannerLabel}>BRAIN TWIST RANKED</Text>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.bannerDetail}>{boardHint}</Text>
            </View>
            {controls}
            {status}
            <Podium entries={data.entries} game={game} ownAvatar={avatarId} onPlayer={setPlayer} />
            {listBar}
          </>
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={playerLabel(item, game)}
            onPress={() => setPlayer(item)} style={({ pressed }) => [styles.row, Prototype && styles.compactRow, item.isYou && styles.ownRow, pressed && styles.pressed]}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Avatar id={item.isYou ? avatarId : item.avatarId} size={34} />
            <View style={styles.nameCell}>
              <Text numberOfLines={1} style={styles.name}>{item.name}{item.isYou ? ' (you)' : ''}</Text>
              {(!Prototype || variantKey !== 'C') && <Movement amount={item.movement} />}
            </View>
            <Text style={styles.score}>{resultLabel(item, game)}</Text>
            {Prototype && variantKey === 'C' && <View style={styles.tableMovement}><Movement amount={item.movement} /></View>}
          </Pressable>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.accent} />}
      />
      {hasData && (
        <View style={styles.dock}>
          <Pressable accessibilityRole={data.you ? 'button' : undefined} onPress={data.you ? () => setPlayer(data.you) : undefined}
            style={styles.personal}>
            <Avatar id={avatarId} size={38} />
            <View style={styles.nameCell}>
              <Text style={styles.personalLabel}>Your rank{failure || previousPeriod ? ' · saved' : ''}</Text>
              <Text style={styles.name}>{data.you ? `#${data.you.rank} of ${data.ranked}` : 'Unranked'}</Text>
            </View>
            {data.you && <><Text style={styles.score}>{resultLabel(data.you, game)}</Text><Movement amount={data.you.movement} /></>}
          </Pressable>
        </View>
      )}
      {periodOpen && <Modal transparent visible onRequestClose={closePeriod}>
        <View style={styles.periodOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss ranking period"
            onPress={closePeriod} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom']} style={styles.periodSheet} accessibilityViewIsModal>
            <View style={styles.periodHeading}>
              <Text accessibilityRole="header" style={styles.periodTitle}>Ranking period</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close ranking period" onPress={closePeriod}
                style={styles.periodClose}><Text style={styles.periodCloseText}>×</Text></Pressable>
            </View>
            {periods.map(([id, label, hint]) => (
              <Pressable key={id} accessibilityRole="radio" accessibilityLabel={label}
                accessibilityState={{ checked: id === period }} onPress={() => {
                  closePeriod();
                  changeFilter(setPeriod, id, period);
                }} style={({ pressed }) => [styles.periodOption, id === period && styles.periodSelected, pressed && styles.pressed]}>
                <View style={styles.nameCell}>
                  <Text style={styles.periodLabel}>{label}</Text>
                  <Text style={styles.muted}>{hint}</Text>
                </View>
                {id === period && <Text accessible={false} style={styles.periodCheck}>✓</Text>}
              </Pressable>
            ))}
          </SafeAreaView>
        </View>
      </Modal>}
      {Prototype && <PrototypeSwitcher current={variantKey} onChange={changeVariant} paused={Boolean(player) || periodOpen} names={prototypeNames} />}
      {player && <LeaderboardProfile key={player.key} entry={player} ownAvatar={avatarId} onClose={() => setPlayer(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  prototypeShelf: { paddingBottom: space.tap + 2 * space.xs },
  list: { width: '100%', maxWidth, alignSelf: 'center', padding: space.page, flexGrow: 1 },
  banner: { backgroundColor: colors.arcade, borderRadius: space.card, padding: space.page, gap: space.xs },
  bannerLabel: { ...type.label, color: colors.arcadeLime },
  bannerDetail: { color: colors.arcadeWhite },
  title: { ...type.heading, color: colors.paper },
  periodRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  periodTrigger: { flexDirection: 'row', minHeight: space.tap, borderRadius: space.radius, backgroundColor: colors.tint,
    alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  periodLabel: { color: colors.arcade, fontWeight: '800' },
  chevron: { width: 7, height: 7, borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.accent, transform: [{ rotate: '45deg' }] },
  periodOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  periodSheet: { width: '100%', maxWidth: 480, gap: space.xs, padding: space.page,
    backgroundColor: colors.paper, borderTopLeftRadius: space.card, borderTopRightRadius: space.card },
  periodHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodTitle: { ...type.heading, color: colors.arcade, fontSize: 22, flexShrink: 1 },
  periodClose: { width: space.tap, minHeight: space.tap, justifyContent: 'center', alignItems: 'center' },
  periodCloseText: { fontSize: 26, color: colors.muted },
  periodOption: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: space.radius,
    padding: space.sm, paddingHorizontal: space.md, gap: space.sm },
  periodSelected: { backgroundColor: colors.tint },
  periodCheck: { color: colors.accent, fontWeight: '900' },
  chips: { gap: space.sm, paddingVertical: space.sm },
  levels: { flexDirection: 'row', gap: space.xs },
  filter: { flex: 1, paddingHorizontal: space.xs },
  periodInfo: { color: colors.muted, fontSize: 12, flex: 1, minWidth: 135 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.sm, marginTop: space.sm },
  podiumPlayer: { flex: 1, maxWidth: 230, minWidth: 0, minHeight: 145, padding: space.xs, paddingVertical: space.sm, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  winner: { minHeight: 170 },
  podiumRank: { color: colors.arcade, fontSize: 17, fontWeight: '900' },
  podiumName: { color: colors.arcade, width: '100%', textAlign: 'center', fontWeight: '900' },
  podiumValue: { color: colors.arcade, fontWeight: '800', fontVariant: ['tabular-nums'] },
  section: { color: colors.arcade, fontWeight: '900', fontSize: 20, marginTop: space.sm },
  message: { paddingVertical: space.md, gap: space.sm, alignItems: 'flex-start' },
  muted: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 60, padding: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  compactRow: { minHeight: 52, paddingVertical: space.xs },
  tableMovement: { minWidth: space.xl, alignItems: 'flex-end' },
  ownRow: { backgroundColor: colors.tint },
  rank: { color: colors.accent, minWidth: space.xl, fontWeight: '900', fontVariant: ['tabular-nums'] },
  nameCell: { flex: 1, gap: 2 },
  name: { color: colors.arcade, fontWeight: '900' },
  score: { color: colors.arcade, fontWeight: '800', fontVariant: ['tabular-nums'] },
  up: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  down: { color: colors.error, fontWeight: '800', fontSize: 12 },
  dock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.paper },
  personal: { alignSelf: 'center', width: '100%', maxWidth, minHeight: 64, padding: space.sm, paddingHorizontal: space.page, flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  personalLabel: { ...type.label, color: colors.accent, letterSpacing: 0.65 },
  pressed: { opacity: 0.7 },
});
