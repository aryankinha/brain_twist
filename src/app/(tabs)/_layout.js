import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../../theme';

function TabIcon({ home = false, focused, color }) {
  return (
    <View accessible={false} style={[styles.icon, focused && styles.activeIcon]}>
      {home ? (
        <View style={styles.house}>
          <View style={[styles.roof, { borderColor: color }]} />
          <View style={[styles.walls, { borderColor: color }]} />
        </View>
      ) : (
        <View style={styles.podium}>
          <View style={[styles.bar, styles.shortBar, { backgroundColor: color }]} />
          <View style={[styles.bar, styles.tallBar, { backgroundColor: color }]} />
          <View style={[styles.bar, styles.midBar, { backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs id="main-tabs" screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      sceneStyle: { backgroundColor: colors.background },
      tabBarStyle: [styles.tabBar, { height: space.tap + space.md + bottom }],
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: styles.label,
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        headerShown: false,
        tabBarIcon: ({ focused, color }) => <TabIcon home focused={focused} color={color} />,
      }} />
      <Tabs.Screen name="leaderboard" options={{
        title: 'Leaderboard',
        tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: { fontSize: 12, fontWeight: '800' },
  icon: { width: 38, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: colors.tint },
  house: { width: 19, height: 20, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: space.line },
  roof: {
    position: 'absolute', top: 4, width: 12, height: 12,
    borderTopWidth: space.line, borderLeftWidth: space.line, borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  walls: { width: 12, height: 9, borderWidth: space.line, borderTopWidth: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  podium: { height: 17, flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { width: 4, borderRadius: 2 },
  shortBar: { height: 8 },
  tallBar: { height: 15 },
  midBar: { height: 11 },
});
