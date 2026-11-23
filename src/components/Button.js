import { Pressable, StyleSheet, Text } from 'react-native';
import { useFeedback } from '../feedback';
import { colors, elevation, motion, space } from '../theme';

export default function Button({ title, onPress, disabled = false, style = undefined, labelStyle = undefined, detail = null, selected = undefined, primary = false }) {
  const animate = useFeedback()?.animate;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail == null ? title : `${title}, ${detail} remaining`}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button, selected && styles.selected, primary && styles.primary, style, pressed && styles.pressed, pressed && animate && styles.compress, disabled && styles.dimmed,
      ]}
    >
      <Text style={[styles.label, primary && styles.primaryLabel, labelStyle]}>{title}</Text>
      {detail != null && <Text style={styles.detail}>{detail}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: space.hairline,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    borderRadius: space.radius,
    minHeight: space.tap,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.tint },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent, elevation: elevation.action },
  primaryLabel: { color: colors.paper },
  pressed: { opacity: 0.8, elevation: 0 },
  compress: { transform: [{ scale: motion.press }] },
  detail: { color: colors.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  dimmed: { opacity: 0.5 },
  label: { color: colors.text, fontWeight: '700', textAlign: 'center' },
});
