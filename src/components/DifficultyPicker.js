import { useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { levelDetails, levelKey, levels } from '../difficulty';
import { useFeedback } from '../feedback';
import { formatScore } from '../format';
import { colors, space, type } from '../theme';
import { useGamePulse } from '../use-game-pulse';
import ArcadeArt from './ArcadeArt';
import Button from './Button';
import Reveal from './Reveal';

export default function DifficultyPicker({ mode, fixedLevel, bests, onClose, onContinue }) {
  const [selected, setSelected] = useState(fixedLevel ?? 'easy');
  const { play } = useFeedback();
  const { bump, pulse } = useGamePulse();
  const options = fixedLevel ? [fixedLevel] : mode.key === 'stroop' ? ['easy'] : levels;

  return (
    <Modal transparent visible onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.center}>
          <Reveal celebratory style={styles.panel}>
            <View style={[styles.banner, { backgroundColor: mode.tone }]}>
              <View style={styles.bannerCopy}>
                <Text style={styles.label}>{fixedLevel ? 'Daily challenge' : 'Choose your level'}</Text>
                <Text accessibilityRole="header" style={styles.title}>{mode.title}</Text>
              </View>
              <ArcadeArt game={mode.key} size={62} card />
            </View>
            {options.map((level) => {
              const key = levelKey(mode.key, level);
              const title = mode.key === 'stroop' ? 'Sprint' : level;
              return (
                <Pressable key={level} accessibilityRole="radio" accessibilityLabel={title}
                  aria-checked={selected === level}
                  onPress={() => { play('tap'); setSelected(level); bump(0.65); }}
                  style={[styles.option, selected === level && styles.selected]}>
                  <View style={styles.optionCopy}>
                    <Text style={styles.levelName}>{title}</Text>
                    <Text style={styles.detail}>{levelDetails[mode.key][levels.indexOf(level)]}</Text>
                  </View>
                  <Text style={styles.best}>{bests[key] == null ? '—' : formatScore(key, bests[key])}</Text>
                  <Animated.Text accessible={false} style={[
                    styles.mark, selected === level && { transform: [{ scale: pulse }] },
                  ]}>{selected === level ? '●' : '○'}</Animated.Text>
                </Pressable>
              );
            })}
            <View style={styles.actions}>
              <Button title="Back" onPress={onClose} style={styles.back} />
              <Button primary title="Continue" onPress={() => onContinue(levelKey(mode.key, selected))} style={styles.go} />
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
  panel: { width: '100%', maxWidth: space.maxBoard, borderRadius: space.card, padding: space.md, backgroundColor: colors.paper, gap: space.sm },
  banner: { borderRadius: space.radius, padding: space.md, minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bannerCopy: { flex: 1, gap: space.xs },
  label: { ...type.label, color: colors.arcade },
  title: { ...type.heading, color: colors.arcade, fontSize: 26 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 62, borderWidth: space.line, borderColor: colors.border, borderRadius: space.radius, padding: space.sm },
  selected: { borderColor: colors.violetInk, backgroundColor: colors.violet },
  optionCopy: { flex: 1, gap: 2 },
  levelName: { fontWeight: '900', fontSize: 16, textTransform: 'capitalize', color: colors.arcade },
  detail: { color: colors.muted, fontSize: 12 },
  best: { fontWeight: '800', color: colors.muted, fontVariant: ['tabular-nums'] },
  mark: { fontSize: 17, color: colors.violetInk },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  back: { flex: 1 },
  go: { flex: 2 },
});
