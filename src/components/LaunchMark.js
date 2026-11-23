import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loadPreferences } from '../storage';
import { colors, motion, space, type } from '../theme';

const marks = [
  ['✦', colors.arcadeViolet], ['▦', colors.arcadeBlue], ['●', colors.arcadePink],
  ['◆', colors.arcadeLime], ['B', colors.paper], ['+', colors.arcadeAmber],
  ['◒', colors.arcadePink], ['▪', colors.arcadeViolet], ['▲', colors.arcadeLime],
];

export default function LaunchMark() {
  const [values] = useState(() => marks.map(() => new Animated.Value(0)));

  useEffect(() => {
    let active = true;
    let animation;
    Promise.all([AccessibilityInfo.isReduceMotionEnabled(), loadPreferences()]).then(([reduced, preferences]) => {
      if (!active || reduced || preferences.animations === false) return;
      animation = Animated.loop(Animated.sequence([
        Animated.stagger(motion.tileStep, values.map((value) => Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: motion.enter, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }),
          Animated.timing(value, { toValue: 0, duration: motion.launch, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }),
        ]))),
        Animated.delay(motion.enter),
      ]));
      animation.start();
    }).catch(() => {});
    return () => { active = false; animation?.stop(); };
  }, [values]);

  return (
    <View accessibilityLabel="Loading Brain Twist" accessibilityRole="progressbar" style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.grid} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {marks.map(([glyph, fill], index) => (
          <Animated.View key={glyph} style={[styles.tile, { backgroundColor: fill, transform: [
            { scale: values[index].interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.06] }) },
            { translateY: values[index].interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
          ] }]}>
            <Text style={styles.symbol}>{glyph}</Text>
          </Animated.View>
        ))}
      </View>
      <Text style={styles.brand}>Brain Twist</Text>
      <Text style={styles.loading}>Loading games</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md, backgroundColor: colors.arcade },
  grid: { width: 170, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center', transform: [{ rotate: '-8deg' }], marginBottom: space.lg },
  tile: { width: 48, height: 48, borderRadius: space.radius, alignItems: 'center', justifyContent: 'center' },
  symbol: { color: colors.arcade, fontSize: 25, fontWeight: '900' },
  brand: { ...type.heading, color: colors.paper },
  loading: { ...type.label, color: colors.arcadeViolet },
});
