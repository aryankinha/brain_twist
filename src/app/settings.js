import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import { useFeedback } from '../feedback';
import { colors, space, type } from '../theme';
import { useUser } from '../user-context';

const options = [['sound', 'Sound effects'], ['haptics', 'Haptic feedback'], ['animations', 'Motion effects']];

export default function SettingsScreen() {
  const { profile, editProfile } = useUser();
  const { preferences, loaded, saveError, change } = useFeedback();
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.label}>Player</Text>
        <View style={styles.profile}>
          <Avatar id={profile.avatarId} size={64} />
          <Text accessibilityRole="header" style={styles.title}>{profile.name}</Text>
        </View>
        <Button title="Edit profile" onPress={editProfile} />
        <Text style={styles.label}>Game feedback</Text>
        {options.map(([key, label]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.text}>{label}</Text>
            <Switch accessibilityLabel={label} value={preferences[key]} disabled={!loaded}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={preferences[key] ? colors.lime : colors.paper}
              onValueChange={(value) => change(key, value)} />
          </View>
        ))}
        {saveError && <Text style={styles.text}>Preferences could not be saved on this device.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { padding: space.page, gap: space.md, width: '100%', maxWidth: 540, alignSelf: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: colors.surface, borderRadius: space.card },
  title: { ...type.heading, color: colors.text, flex: 1 },
  label: { ...type.label, color: colors.muted, marginTop: space.sm },
  row: { minHeight: space.tap, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: space.hairline, borderBottomColor: colors.border, gap: space.sm },
  text: { color: colors.text, fontSize: 16, flexShrink: 1 },
});
