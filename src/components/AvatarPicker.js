import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../theme';
import Avatar, { avatars } from './Avatar';

export default function AvatarPicker({ value, onChange, disabled }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Choose an avatar</Text>
      <View style={styles.grid}>
        {Object.entries(avatars).map(([id, avatar]) => (
          <Pressable key={id} accessibilityRole="radio" accessibilityLabel={avatar.name}
            aria-checked={value === id} disabled={disabled} onPress={() => onChange(id)}
            style={({ pressed }) => [styles.option, value === id && styles.selected, pressed && styles.pressed]}>
            <Avatar id={id} size={42} />
            <Text style={styles.label}>{avatar.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  heading: { ...type.label, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { width: '30%', flexGrow: 1, paddingVertical: space.sm, paddingHorizontal: space.xs, gap: space.xs,
    alignItems: 'center', justifyContent: 'center', borderWidth: space.line, borderColor: colors.border, borderRadius: space.radius },
  selected: { borderColor: colors.violetInk, backgroundColor: colors.violet },
  pressed: { opacity: 0.7 },
  label: { fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' },
});
