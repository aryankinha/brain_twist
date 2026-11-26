import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, space, type } from '../theme';
import Button from './Button';
import Reveal from './Reveal';

export default function GameBrief({ kicker, title, tone, detail, best, children, startLabel, onStart }) {
  const { height } = useWindowDimensions();
  const compact = height < 680;

  return (
    <Reveal style={styles.brief}>
      <View style={[styles.stage, compact && styles.compactSurface, { backgroundColor: tone }]}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
        <View style={[styles.visual, compact && styles.compactVisual]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={compact && styles.compactArt}>{children}</View>
        </View>
      </View>
      <View style={[styles.summary, compact && styles.compactSurface]}>
        <Text style={styles.detail}>{detail}</Text>
        <View style={styles.record}>
          <Text style={styles.recordLabel}>Personal best</Text>
          <Text style={styles.recordValue}>{best}</Text>
        </View>
      </View>
      <Button primary title={startLabel} onPress={onStart} style={styles.cta} />
    </Reveal>
  );
}

const styles = StyleSheet.create({
  brief: { flexGrow: 1, width: '100%', maxWidth: space.maxBoard, gap: space.md },
  stage: { flexGrow: 1, borderRadius: space.card, padding: space.page, gap: space.sm },
  kicker: { ...type.label, color: colors.arcade },
  title: { ...type.heading, fontSize: 32, color: colors.arcade },
  visual: { flexGrow: 1, minHeight: 146, justifyContent: 'center', alignItems: 'center', paddingVertical: space.md },
  summary: { padding: space.page, gap: space.md, borderWidth: space.hairline, borderColor: colors.border, borderRadius: space.radius, backgroundColor: colors.paper },
  detail: { color: colors.text, fontSize: 15, lineHeight: 21 },
  record: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm, paddingTop: space.sm, borderTopWidth: space.hairline, borderTopColor: colors.border },
  recordLabel: { color: colors.muted, fontWeight: '700' },
  recordValue: { color: colors.accent, fontWeight: '900', fontVariant: ['tabular-nums'] },
  compactSurface: { padding: space.md },
  compactTitle: { fontSize: 26 },
  compactVisual: { flexGrow: 0, height: 112, minHeight: 0, paddingVertical: 0 },
  compactArt: { transform: [{ scale: 0.53 }] },
  cta: { minHeight: 54 },
});
