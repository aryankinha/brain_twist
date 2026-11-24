import { useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { levelDetails, levelKey, levels } from '../difficulty';
import { useFeedback } from '../feedback';
import { formatScore, scoreUnit } from '../format';
import { colors, motion, space, type } from '../theme';
import { useGamePulse } from '../use-game-pulse';
import ArcadeArt from './ArcadeArt';
import Button from './Button';
import Reveal from './Reveal';

export default function DifficultyPicker({ mode, fixedLevel, bests, onClose, onContinue }) {
  const [selected, setSelected] = useState(fixedLevel ?? 'easy');
  const { play, animate } = useFeedback();
  const { bump, pulse } = useGamePulse();
  const hasLevels = mode.key !== 'stroop';
  const title = hasLevels ? selected : 'Sprint';
  const key = levelKey(mode.key, selected);
  const unit = scoreUnit(key);
  const best = bests[key];
  const record = best == null ? '—' : `${formatScore(key, best)}${unit === 'time' ? '' : ` ${unit === 'points' ? 'pts' : unit}`}`;

  return (
    <Modal transparent visible onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.center}>
          <Reveal celebratory style={styles.panel}>
            <View style={styles.banner}>
              <View style={styles.bannerCopy}>
                <Text style={styles.label}>{fixedLevel ? 'Daily challenge' : hasLevels ? 'Choose your level' : mode.category}</Text>
                <Text accessibilityRole="header" style={styles.title}>{mode.title}</Text>
              </View>
              <View accessible={false} style={[styles.art, { backgroundColor: mode.tone }]}>
                <ArcadeArt game={mode.key} size={49} card />
              </View>
            </View>

            {hasLevels && !fixedLevel && (
              <View accessibilityRole="radiogroup" accessibilityLabel="Difficulty" style={styles.levels}>
                {levels.map((level) => (
                  <Pressable key={level} accessibilityRole="radio" aria-checked={selected === level}
                    onPress={() => { if (selected !== level) { play('tap'); setSelected(level); bump(0.92); } }}
                    style={({ pressed }) => [styles.level, selected === level && { backgroundColor: mode.tone },
                      pressed && animate && styles.compress]}>
                    <Text style={[styles.levelLabel, selected === level && styles.levelSelected]}>{level}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View accessibilityLiveRegion="polite" style={styles.summary}>
              <View style={styles.summaryCopy}>
                <Animated.Text style={[styles.selectedTitle, { transform: [{ scale: pulse }] }]}>{title}</Animated.Text>
                <Text style={styles.detail}>{levelDetails[mode.key][levels.indexOf(selected)]}</Text>
              </View>
              <View style={styles.best}>
                <Text style={styles.record}>{record}</Text>
                <Text style={styles.detail}>Personal best</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Button title="Back" onPress={onClose} style={styles.back} />
              <Button primary title="Continue" onPress={() => onContinue(key)} style={styles.go} />
            </View>
          </Reveal>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.page },
  panel: { width: '100%', maxWidth: space.maxBoard, borderRadius: space.card, padding: space.page, backgroundColor: colors.paper, gap: space.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bannerCopy: { flex: 1, gap: space.xs },
  art: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: space.radius },
  label: { ...type.label, color: colors.violetInk },
  title: { ...type.heading, color: colors.arcade, fontSize: 27 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  level: { flexGrow: 1, flexBasis: 82, minHeight: space.tap, padding: space.xs, justifyContent: 'center', borderRadius: space.sm, backgroundColor: colors.surface },
  levelLabel: { color: colors.muted, textAlign: 'center', textTransform: 'capitalize', fontWeight: '700' },
  levelSelected: { color: colors.arcade, fontWeight: '900' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: space.md },
  summaryCopy: { flex: 1, minWidth: 115, gap: 2 },
  selectedTitle: { color: colors.arcade, fontSize: 24, fontWeight: '900', textTransform: 'capitalize' },
  detail: { color: colors.muted, fontSize: 12 },
  best: { gap: 2 },
  record: { color: colors.arcade, fontWeight: '900', fontSize: 19, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
  back: { flex: 1 },
  go: { flex: 2 },
  compress: { transform: [{ scale: motion.press }] },
});
