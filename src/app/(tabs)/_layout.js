import { Tabs } from 'expo-router';
import { colors, space } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs id="main-tabs" screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      sceneStyle: { backgroundColor: colors.background },
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 14, fontWeight: '800' },
      tabBarItemStyle: { marginHorizontal: space.sm, marginVertical: space.xs, borderRadius: space.radius },
      tabBarActiveBackgroundColor: colors.tint,
      tabBarIconStyle: { display: 'none' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Games', headerShown: false }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
    </Tabs>
  );
}
