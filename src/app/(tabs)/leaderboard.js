import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLeaderboard } from '../../api';
import Button from '../../components/Button';
import { levelKey, levels } from '../../difficulty';
import { formatScore, gameLabels, scoreUnit } from '../../format';
import { colors, space, type } from '../../theme';
import { useUser } from '../../user-context';

const tabs = [
  ['overall', 'Overall'], ['sudoku', 'Sudoku'], ['lights', 'Lights Out'], ['schulte', 'Schulte'],
  ['sequence', 'Sequence Memory'], ['stroop', 'Stroop'],
];

export default function LeaderboardScreen() {
  const { profile } = useUser();
  const userId = profile.userId;
  const [game, setGame] = useState('overall');
  const group = game.split('-')[0];
  const overall = group === 'overall';
  const usesLevels = !overall && group !== 'stroop';
  const [expanded, setExpanded] = useState(null);
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
        setEntries(data.you ? [...data.entries, data.you] : data.entries);
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
    setExpanded(null);
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
          {tabs.map(([key, label]) => (
            <Button key={key} title={label} selected={key === group}
              onPress={() => { if (key !== group) select(key === 'overall' ? key : levelKey(key, 'easy')); }} />
          ))}
        </ScrollView>
      </View>
      {usesLevels && (
        <View style={styles.levels}>
          {levels.map((level) => {
            const key = levelKey(group, level);
            return <Button key={key} title={level[0].toUpperCase() + level.slice(1)} selected={game === key} onPress={() => select(key)} style={styles.level} />;
          })}
        </View>
      )}
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>{overall ? 'Overall standings' : gameLabels[game]}</Text>
        <Text style={styles.boardHint}>{overall ? 'Tap a player to see their scores' : { points: 'Highest score wins', rounds: 'Most rounds wins', moves: 'Fewest moves wins', time: 'Fastest time wins' }[scoreUnit(game)]}</Text>
      </View>
      {overall && <Text style={styles.explanation}>Each game has equal weight. Best results in each level earn points based on how they rank.</Text>}
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
        keyExtractor={(entry, index) => `${entry.rank}-${index}`}
        renderItem={({ item, index }) => {
          const open = expanded === index;
          const heading = (
            <>
              <Text style={styles.rank}>#{item.rank}</Text>
              <View style={styles.nameCell}>
                <Text style={styles.name}>{item.name}{item.isYou ? ' (you)' : ''}</Text>
                {overall && <Text style={styles.muted}>{Object.keys(item.scores).length} levels ranked</Text>}
              </View>
              <Text style={styles.score}>{overall ? `${item.total} pts` : formatScore(game, item.value)}</Text>
              {overall && <Text style={styles.expand}>{open ? '−' : '+'}</Text>}
            </>
          );
          return overall ? (
            <View style={[styles.player, item.isYou && styles.you]}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : index)} style={styles.row}>
                {heading}
              </Pressable>
              {open && <View style={styles.breakdown}>
                {Object.entries(item.scores).map(([key, score]) => (
                  <View key={key} style={styles.breakdownRow}>
                    <Text style={styles.breakdownName}>{gameLabels[key] ?? key}</Text>
                    <Text style={styles.muted}>{formatScore(key, score.value)}</Text>
                    <Text style={styles.breakdownPoints}>{score.points} pts</Text>
                  </View>
                ))}
              </View>}
            </View>
          ) : <View style={[styles.row, item.isYou && styles.you]}>{heading}</View>;
        }}
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
  levels: { flexDirection: 'row', marginHorizontal: space.page, marginBottom: space.md, gap: space.sm },
  level: { flex: 1, paddingHorizontal: space.xs },
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
  explanation: { color: colors.muted, marginHorizontal: space.page, marginBottom: space.md, fontSize: 13, lineHeight: 18 },
  nameCell: { flex: 1, gap: 2 },
  name: { color: colors.text, fontWeight: '800' },
  player: { borderWidth: space.hairline, borderColor: colors.border, borderRadius: space.radius, marginBottom: space.sm, overflow: 'hidden' },
  expand: { color: colors.accent, fontWeight: '900', fontSize: 18 },
  breakdown: { paddingHorizontal: space.md, backgroundColor: colors.surface },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', minHeight: 38, gap: space.sm, borderBottomWidth: space.hairline, borderBottomColor: colors.border },
  breakdownName: { color: colors.text, flex: 1, fontSize: 12 },
  breakdownPoints: { color: colors.violetInk, fontWeight: '800', fontSize: 12 },
  score: { color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
