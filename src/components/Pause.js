import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button';
import { colors, space, type } from '../theme';

export default function Pause({ onResume, onLeave, onRestart }) {
  return (
    <Modal visible onRequestClose={onResume}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.panel}>
          <Text accessibilityRole="header" style={styles.title}>Paused</Text>
          <Button primary title="Resume" onPress={onResume} />
          <Button title="Restart" onPress={onRestart} />
          <Button title="Leave game" onPress={onLeave} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: space.lg },
  panel: { width: '100%', maxWidth: space.maxBoard, alignSelf: 'center', gap: space.md },
  title: { ...type.display, color: colors.text, marginBottom: space.sm },
});
