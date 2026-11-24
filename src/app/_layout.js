import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { FeedbackProvider, useFeedback } from '../feedback';
import { UserProvider } from '../user-context';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <View style={styles.root} onLayout={SplashScreen.hide}>
      <StatusBar style="dark" />
      <UserProvider>
        <FeedbackProvider><GameStack /></FeedbackProvider>
      </UserProvider>
    </View>
  );
}

function GameStack() {
  const { animate } = useFeedback();
  return (
    <Stack id="root-stack" screenOptions={{
      animation: animate ? 'slide_from_right' : 'none',
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sudoku" options={{ title: 'Sudoku' }} />
      <Stack.Screen name="schulte" options={{ title: 'Schulte' }} />
      <Stack.Screen name="stroop" options={{ title: 'Stroop' }} />
      <Stack.Screen name="lights" options={{ title: 'Lights Out' }} />
      <Stack.Screen name="sequence" options={{ title: 'Sequence Memory' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.arcade },
});
