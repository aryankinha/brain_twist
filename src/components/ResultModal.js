import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submitScore } from '../api';
import { useFeedback } from '../feedback';
import { dayKey } from '../progress';
import { formatScore, higherScoreWins, scoreUnit } from '../format';
import { saveBest } from '../storage';
import { colors, space, type } from '../theme';
import { useUser } from '../user-context';
import Reveal from './Reveal';
import Button from './Button';

export default function ResultModal({ game, value, children = null, title = 'Round complete', onAgain, onBack }) {
  const { profile } = useUser();
  const { userId, name } = profile;
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState(null);
  const [day] = useState(dayKey);
  const savedRound = useRef(null);
  const announced = useRef(false);
  const { play } = useFeedback();
  const [status, setStatus] = useState('submitting');

  useEffect(() => {
    let active = true;
    async function save() {
      let localSaved = false;
      setStatus('submitting');
      try {
        savedRound.current ??= saveBest(game, value, day).catch((error) => {
          savedRound.current = null;
          throw error;
        });
        const next = await savedRound.current;
        localSaved = true;
        if (active) setRecord(next);
        await submitScore({ userId, name, game, value });
        if (active) setStatus('saved');
      } catch {
        if (active) setStatus(localSaved ? 'submit-error' : 'local-error');
      }
    }
    void save();
    return () => { active = false; };
  }, [attempt, day, game, name, userId, value]);

  const newBest = record && record.previous !== record.best;
  useEffect(() => {
    if (!record || announced.current) return;
    announced.current = true;
    play(newBest || record.dailyCompleted ? 'record' : 'correct');
  }, [newBest, play, record]);
  const unit = scoreUnit(game);
  const difference = record?.previous == null ? null : higherScoreWins(game)
    ? value - record.previous
    : record.previous - value;

  return (
    <Modal visible transparent onRequestClose={onBack}>
      <SafeAreaView style={styles.overlay}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.center}>
        <Reveal style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{newBest ? (record.previous == null ? 'First record' : 'New personal best') : title}</Text>
          <View style={[styles.score, newBest && styles.record]}>
            <Text style={styles.value}>{formatScore(game, value)}</Text>
            <Text style={styles.label}>{unit === 'time' ? 'FINISH TIME' : unit.toUpperCase()}</Text>
          </View>
          <Text style={styles.text}>Personal best  {formatScore(game, record?.best)}</Text>
          {difference !== null && difference !== 0 && (
            <Text style={styles.status}>
              {unit === 'moves'
                ? `${Math.abs(difference)} ${Math.abs(difference) === 1 ? 'move' : 'moves'} ${difference > 0 ? 'fewer' : 'more'} than your previous best`
                : higherScoreWins(game)
                ? `${Math.abs(difference)} ${unit} ${difference > 0 ? 'above' : 'below'} your previous best`
                : `${(Math.abs(difference) / 1000).toFixed(1)}s ${difference > 0 ? 'faster' : 'slower'} than your previous best`}
            </Text>
          )}
          {record?.dailyCompleted && <Text style={styles.daily}>✓ Daily challenge complete</Text>}
          {children}
          {status === 'submit-error' || status === 'local-error' ? (
            <Button
              title={status === 'submit-error' ? "Couldn't submit — Retry" : "Couldn't save locally — Retry"}
              onPress={() => setAttempt(attempt + 1)}
            />
          ) : (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {status === 'saved' ? 'Saved' : 'Submitting…'}
            </Text>
          )}
          <View style={styles.actions}>
            <Button primary title="Play again" onPress={onAgain} style={styles.action} />
            <Button title="Back" onPress={onBack} style={styles.action} />
          </View>
        </Reveal>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay },
  scroll: { width: '100%' },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.page },
  card: { width: '100%', maxWidth: space.maxBoard, backgroundColor: colors.paper, borderRadius: space.card, padding: space.lg, gap: space.md },
  title: { ...type.heading, color: colors.text },
  score: { backgroundColor: colors.tint, borderRadius: space.radius, padding: space.page },
  value: { ...type.display, fontVariant: ['tabular-nums'], color: colors.text },
  record: { backgroundColor: colors.lime },
  label: { ...type.label, color: colors.text },
  daily: { color: colors.limeInk, backgroundColor: colors.lime, padding: space.sm, fontWeight: '800' },
  text: { color: colors.text },
  status: { color: colors.muted },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
});
