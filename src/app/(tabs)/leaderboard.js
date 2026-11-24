import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import LeaderboardProfile from '../../components/LeaderboardProfile';
import Reveal from '../../components/Reveal';
import { getLeaderboard, getLeaderboardRevision } from '../../api';
import { levelKey, levels } from '../../difficulty';
import { formatScore, gameLabels, scoreUnit } from '../../format';
import { colors, space, type } from '../../theme';
import { useUser } from '../../user-context';

const tabs = [
  ['overall', 'Overall'], ['sudoku', 'Sudoku'], ['lights', 'Lights Out'], ['schulte', 'Schulte'],
  ['sequence', 'Sequence Memory'], ['stroop', 'Stroop'],
];
const periods = [['day', 'Daily'], ['week', 'Weekly'], ['all', 'All time']];
const defaultData = { entries: [], you: null, ranked: 0, endsAt: null };
const medals = [colors.amber, colors.sky, colors.peach];
const maxWidth = 850;

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
  const { userId, avatarId } = profile;
  const [game, setGame] = useState('overall');
  const [period, setPeriod] = useState('week');
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const cache = useRef(new Map());
  const request = useRef(null);
  const group = game.split('-')[0];
  const overall = game === 'overall';
  const key = `${game}/${period}`;
  const data = snapshot?.key === key ? snapshot.data : defaultData;
  const hasData = snapshot?.key === key;
  const title = overall ? 'Overall standings' : gameLabels[game];

  const load = useCallback((force = false) => {
    const saved = cache.current.get(key);
    const now = Date.now();
    const revision = getLeaderboardRevision();
    const current = saved && (saved.data.endsAt == null || saved.data.endsAt > now);
    if (current) setSnapshot(saved);
    if (saved && !current) setSnapshot(null);
    if (!force && current && saved.revision === revision && now - saved.at < 30_000) {
      setLoading(false);
      setRefreshing(false);
      setFailure(null);
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(!current);
    setFailure(null);
    getLeaderboard(game, userId, period, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ranked == null) throw new Error('Period rankings are unavailable');
        const next = { key, data: result, revision, at: Date.now() };
        cache.current.set(key, next);
        setSnapshot(next);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setFailure(error.name === 'TypeError' ? 'offline' : 'error');
      })
      .finally(() => {
        if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
      });
  }, [game, key, period, userId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => request.current?.abort();
  }, [load]));

  const endsAt = data.endsAt;
  useFocusEffect(useCallback(() => {
    if (endsAt == null) return;
    const timer = setTimeout(() => load(true), Math.max(0, endsAt - Date.now()));
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

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.list}
        data={data.entries.slice(3)}
        keyExtractor={(entry) => entry.key}
        ListHeaderComponent={
          <>
            <View style={styles.banner}>
              <Text style={styles.bannerLabel}>BRAIN TWIST RANKED</Text>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.bannerDetail}>{boardHint}</Text>
            </View>
            <View style={styles.periods}>
              {periods.map(([id, label]) => (
                <Button key={id} title={label} selected={id === period} style={styles.filter}
                  onPress={() => changeFilter(setPeriod, id, period)} />
              ))}
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
            <Text style={styles.periodInfo}>{period === 'day' ? 'Resets at midnight UTC · compared with yesterday' : period === 'week' ? 'Resets Monday UTC · compared with last week' : 'Movement since Monday UTC'}</Text>
            {loading && !refreshing && <ActivityIndicator style={styles.message} color={colors.accent} accessibilityLabel="Loading standings" />}
            {failure && <View style={styles.message}>
              <Text style={styles.muted}>{failure === 'offline' ? 'Connection unavailable.' : 'Could not load standings.'} {hasData ? 'Showing the last loaded standings.' : ''}</Text>
              <Button title="Retry" onPress={() => load(true)} />
            </View>}
            {!loading && !failure && !data.entries.length && <View style={styles.message}>
              <Text accessibilityRole="header" style={styles.section}>No ranked scores yet</Text>
              <Text style={styles.muted}>Finish a round to enter this board.</Text>
            </View>}
            <Podium entries={data.entries} game={game} ownAvatar={avatarId} onPlayer={setPlayer} />
            {hasData && !failure && (
              <View style={styles.listBar}>
                {data.entries.length > 3 && <Text accessibilityRole="header" style={styles.section}>Standings</Text>}
                <Button title="Refresh standings" style={styles.refreshButton} onPress={() => load(true)} />
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={playerLabel(item, game)}
            onPress={() => setPlayer(item)} style={({ pressed }) => [styles.row, item.isYou && styles.ownRow, pressed && styles.pressed]}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Avatar id={item.isYou ? avatarId : item.avatarId} size={34} />
            <View style={styles.nameCell}>
              <Text numberOfLines={1} style={styles.name}>{item.name}{item.isYou ? ' (you)' : ''}</Text>
              <Movement amount={item.movement} />
            </View>
            <Text style={styles.score}>{resultLabel(item, game)}</Text>
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
              <Text style={styles.personalLabel}>Your rank{failure ? ' · saved' : ''}</Text>
              <Text style={styles.name}>{data.you ? `#${data.you.rank} of ${data.ranked}` : 'Unranked'}</Text>
            </View>
            {data.you && <><Text style={styles.score}>{resultLabel(data.you, game)}</Text><Movement amount={data.you.movement} /></>}
          </Pressable>
        </View>
      )}
      {player && <LeaderboardProfile key={player.key} entry={player} ownAvatar={avatarId} onClose={() => setPlayer(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { width: '100%', maxWidth, alignSelf: 'center', padding: space.page, flexGrow: 1 },
  banner: { backgroundColor: colors.arcade, borderRadius: space.card, padding: space.page, gap: space.xs },
  bannerLabel: { ...type.label, color: colors.arcadeLime },
  bannerDetail: { color: colors.arcadeWhite },
  title: { ...type.heading, color: colors.paper },
  periods: { flexDirection: 'row', gap: space.xs, marginTop: space.md },
  chips: { gap: space.sm, paddingVertical: space.sm },
  levels: { flexDirection: 'row', gap: space.xs },
  filter: { flex: 1, paddingHorizontal: space.xs },
  periodInfo: { color: colors.muted, fontSize: 12, marginVertical: space.sm },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.sm, marginTop: space.sm },
  podiumPlayer: { flex: 1, maxWidth: 230, minWidth: 0, minHeight: 145, padding: space.xs, paddingVertical: space.sm, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  winner: { minHeight: 170 },
  podiumRank: { color: colors.arcade, fontSize: 17, fontWeight: '900' },
  podiumName: { color: colors.arcade, width: '100%', textAlign: 'center', fontWeight: '900' },
  podiumValue: { color: colors.arcade, fontWeight: '800', fontVariant: ['tabular-nums'] },
  section: { color: colors.arcade, fontWeight: '900', fontSize: 20, marginTop: space.sm },
  message: { paddingVertical: space.md, gap: space.sm, alignItems: 'flex-start' },
  muted: { color: colors.muted, fontSize: 12 },
  listBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  refreshButton: { marginLeft: 'auto' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 60, padding: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
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
