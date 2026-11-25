import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../theme';

export default function PrototypeSwitcher({ current, onChange, paused = false, names, style = undefined }) {
  const move = useCallback((step) => {
    const keys = Object.keys(names);
    onChange(keys[(keys.indexOf(current) + step + keys.length) % keys.length]);
  }, [current, names, onChange]);

  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'web' || paused) return;
    /** @param {KeyboardEvent} event */
    function onKey(event) {
      const target = event.target;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (target instanceof Element && target.closest('input, textarea, select, [contenteditable], [role="tab"]'))) return;
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      move(step);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, paused]));

  return (
    <View style={[styles.switcher, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous layout" onPress={() => move(-1)}
        style={({ pressed }) => [styles.arrow, pressed && styles.arrowActive]}>
        <Text style={styles.switchText}>←</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.switchText, styles.switchLabel]}>{current} · {names[current]}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next layout" onPress={() => move(1)}
        style={({ pressed }) => [styles.arrow, pressed && styles.arrowActive]}>
        <Text style={styles.switchText}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: { position: 'absolute', bottom: space.xs, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: 30, paddingHorizontal: space.xs, backgroundColor: colors.arcade, zIndex: 1 },
  arrowActive: { opacity: 0.7 },
  switchLabel: { minWidth: 104, textAlign: 'center' },
  arrow: { width: space.tap, height: space.tap, alignItems: 'center', justifyContent: 'center' },
  switchText: { color: colors.paper, fontWeight: '800' },
});
