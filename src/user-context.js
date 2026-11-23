import { createContext, useContext, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ping } from './api';
import LaunchMark from './components/LaunchMark';
import Reveal from './components/Reveal';
import Button from './components/Button';
import { loadProfile, saveProfile } from './storage';
import { colors, space, type } from './theme';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  function restore() {
    return loadProfile()
      .then(setProfile, () => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    ping().catch(() => {});
    void restore();
  }, []);

  function editName() {
    setName(profile.name);
    setSaveError(false);
    setEditing(true);
  }

  async function submit() {
    const trimmed = name.trim();
    if (saving || !trimmed || trimmed.length > 20) return;
    setSaving(true);
    setSaveError(false);
    const next = {
      userId: profile?.userId ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
      name: trimmed,
    };
    try {
      await saveProfile(next);
      setProfile(next);
      setEditing(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const close = () => { if (profile && !saving) setEditing(false); };
  return (
    <UserContext.Provider value={{ profile, editName }}>
      {profile ? children : loading ? <LaunchMark /> : (
        <View style={styles.center}>
          {loadError && (
            <Button title="Retry loading profile" onPress={() => {
              setLoading(true);
              setLoadError(false);
              void restore();
            }} />
          )}
        </View>
      )}
      <Modal
        visible={!loading && !loadError && (!profile || editing)}
        onRequestClose={close}
      >
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Reveal style={styles.form}>
              <View style={styles.mark}><Text style={styles.markText}>B</Text></View>
              <Text accessibilityRole="header" style={styles.title}>{profile ? 'Edit name' : 'Enter your name'}</Text>
              <TextInput
                accessibilityLabel="Name"
                placeholder="Name"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={name}
                onChangeText={setName}
                maxLength={20}
                editable={!saving}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              {saveError && <Text style={styles.error}>Couldn’t save your name. Try again.</Text>}
              <Button primary title="Save" onPress={submit} disabled={!name.trim() || saving} />
              {profile && <Button title="Cancel" onPress={close} disabled={saving} />}
            </Reveal>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </UserContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: space.lg },
  mark: { alignSelf: 'center', borderRadius: space.card, padding: space.md, backgroundColor: colors.arcadeViolet },
  markText: { ...type.heading, color: colors.arcade },
  form: { width: '100%', maxWidth: space.maxBoard, alignSelf: 'center', gap: space.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  input: { minHeight: space.tap, padding: space.md, borderRadius: space.radius, backgroundColor: colors.paper, borderWidth: space.hairline, borderColor: colors.border, color: colors.text },
  error: { color: colors.error },
});
