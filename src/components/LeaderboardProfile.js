import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLeaderboardRevision, getPlayer } from '../api';
import { formatScore, gameLabels } from '../format';
import { colors, space, type } from '../theme';
import Avatar from './Avatar';
import Button from './Button';
import Reveal from './Reveal';

const cache = new Map();
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

export default function LeaderboardProfile({ entry, ownAvatar, onClose }) {
  const [profile, setProfile] = useState(() => cache.get(entry.key)?.profile ?? null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const revision = getLeaderboardRevision();
    const saved = cache.get(entry.key);
    if (attempt === 0 && saved?.revision === revision && Date.now() - saved.at < 60_000) return;
    const controller = new AbortController();
    getPlayer(entry.key, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        cache.set(entry.key, { at: Date.now(), profile: data, revision });
        if (cache.size > 60) cache.delete(cache.keys().next().value);
        setProfile(data);
        setStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [attempt, entry.key]);

  const scores = Object.entries(profile?.scores ?? {});
  const games = new Set(scores.map(([key]) => key.split('-')[0])).size;
  const achievements = [
    scores.length > 0 && 'First ranked score',
    games === 5 && 'Ranked in all five games',
    profile?.activeDays >= 7 && 'Seven ranked days',
  ].filter(Boolean);

  return (
    <Modal visible transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.center}>
          <Reveal style={styles.panel}>
            <View style={styles.top}>
              <Avatar id={entry.isYou ? ownAvatar : entry.avatarId} size={54} />
              <Text accessibilityRole="header" style={styles.name}>{profile?.name ?? entry.name}</Text>
              <Button title="Close" onPress={onClose} />
            </View>
            {!profile && status === 'loading' && <ActivityIndicator color={colors.accent} accessibilityLabel="Loading player profile" />}
            {status === 'error' && (
              <View style={styles.section}>
                <Text style={styles.muted}>{profile ? 'Showing saved profile details.' : 'Could not load this profile.'}</Text>
                <Button title="Retry profile" onPress={() => { setStatus('loading'); setAttempt((value) => value + 1); }} />
              </View>
            )}
            {profile && (
              <>
                <Text style={styles.summary}>{games} of 5 games ranked · {profile.activeDays} recorded days</Text>
                <View style={styles.section}>
                  <Text accessibilityRole="header" style={styles.heading}>Achievements</Text>
                  {achievements.map((title) => <Text key={title} style={styles.achievement}>◆  {title}</Text>)}
                  {!achievements.length && <Text style={styles.muted}>No achievements yet.</Text>}
                </View>
                <View style={styles.section}>
                  <Text accessibilityRole="header" style={styles.heading}>Lifetime bests</Text>
                  {scores.map(([game, score]) => (
                    <View key={game} style={styles.scoreRow}>
                      <Text style={styles.game}>{gameLabels[game] ?? game}</Text>
                      <Text style={styles.value}>{formatScore(game, score.value)}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.section}>
                  <Text accessibilityRole="header" style={styles.heading}>Performance history</Text>
                  <Text style={styles.muted}>Best recorded scores on each day. Older days may contain lifetime records only.</Text>
                  {profile.history.map(({ at, scores: results }) => (
                    <View key={at} style={styles.day}>
                      <Text style={styles.dayLabel}>{date.format(at)} UTC</Text>
                      {Object.entries(results).map(([game, score]) => (
                        <View key={game} style={styles.scoreRow}>
                          <Text style={styles.game}>{gameLabels[game] ?? game}</Text>
                          <Text style={styles.value}>{formatScore(game, score.value)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {!profile.history.length && <Text style={styles.muted}>No recorded days yet.</Text>}
                </View>
              </>
            )}
          </Reveal>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.page },
  panel: { width: '100%', maxWidth: 560, backgroundColor: colors.paper, borderRadius: space.card, padding: space.page, gap: space.page },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.heading, fontSize: 22, color: colors.arcade, flex: 1 },
  summary: { color: colors.violetInk, fontWeight: '800', backgroundColor: colors.violet, padding: space.md, borderRadius: space.radius },
  section: { gap: space.sm },
  heading: { color: colors.arcade, fontSize: 19, fontWeight: '900' },
  achievement: { color: colors.accent, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  game: { color: colors.text, flex: 1 },
  value: { color: colors.arcade, fontWeight: '800', fontVariant: ['tabular-nums'] },
  day: { backgroundColor: colors.surface, padding: space.sm, borderRadius: space.radius },
  dayLabel: { ...type.label, color: colors.muted, marginBottom: space.xs, letterSpacing: 0.5 },
});
