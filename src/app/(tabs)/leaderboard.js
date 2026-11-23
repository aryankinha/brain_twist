import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLeaderboard } from '../../api';
import Button from '../../components/Button';
import { formatScore, gameLabels, scoreUnit } from '../../format';
import { colors, space, type } from '../../theme';
import { useUser } from '../../user-context';

export default function LeaderboardScreen() {
  const { profile } = useUser();
  const userId = profile.userId;
  const [game, setGame] = useState('sudoku-easy');
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(null);

  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus('loading');
    getLeaderboard(game, userId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setEntries(data.entries);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
  }, [game, userId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => request.current?.abort();
  }, [load]));

  function select(key) {
    if (key === game) return;
    setEntries([]);
    setStatus('loading');
    setRefreshing(false);
    setGame(key);
  }

  function refresh() {
    setRefreshing(true);
    load();
  }

  return (
    <View style={styles.screen}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {Object.entries(gameLabels).map(([key, label]) => (
            <Button key={key} title={label} selected={key === game} onPress={() => select(key)} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>{gameLabels[game]}</Text>
        <Text style={styles.boardHint}>{{ points: 'Highest score wins', rounds: 'Most rounds wins', moves: 'Fewest moves wins', time: 'Fastest time wins' }[scoreUnit(game)]}</Text>
      </View>
      {status === 'loading' && !refreshing && <ActivityIndicator style={styles.padded} color={colors.accent} />}
      {status === 'error' && (
        <View style={styles.feedback}>
          <Text style={styles.muted}>Leaderboard unavailable. Your personal records are on this device.</Text>
          <Button title="Retry" onPress={load} />
        </View>
      )}
      <FlatList
        contentContainerStyle={styles.list}
        data={status === 'error' ? [] : entries}
        keyExtractor={(entry) => String(entry.rank)}
        renderItem={({ item }) => (
          <View style={[styles.row, item.isYou && styles.you]}>
            <Text style={styles.rank}>{item.rank}</Text>
            <Text style={styles.name}>{item.name}{item.isYou ? ' (you)' : ''}</Text>
            <Text style={styles.score}>{formatScore(game, item.value)}</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ListEmptyComponent={status === 'ready' ? (
          <View style={styles.feedback}><Text style={styles.muted}>No scores yet. Finish a round to post the first.</Text></View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  chips: { padding: space.page, gap: space.sm },
  padded: { padding: space.page },
  feedback: { padding: space.page, gap: space.md, alignItems: 'flex-start' },
  muted: { color: colors.muted },
  boardHeader: { marginHorizontal: space.page, marginBottom: space.sm, borderBottomWidth: space.line, borderBottomColor: colors.text, paddingBottom: space.sm, gap: space.xs },
  boardTitle: { ...type.heading, color: colors.text },
  boardHint: { ...type.label, color: colors.muted },
  list: { padding: space.page, paddingTop: 0, flexGrow: 1 },
  row: { backgroundColor: colors.paper, flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.md, borderBottomWidth: space.hairline, borderBottomColor: colors.border, minHeight: space.tap },
  you: { backgroundColor: colors.tint, borderWidth: space.hairline, borderColor: colors.accent },
  rank: { color: colors.accent, fontWeight: '900', minWidth: space.xl, fontVariant: ['tabular-nums'] },
  name: { flex: 1, color: colors.text },
  score: { color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
