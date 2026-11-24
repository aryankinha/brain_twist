import { createContext, useContext, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ping } from './api';
import Avatar, { avatars, defaultAvatar } from './components/Avatar';
import AvatarPicker from './components/AvatarPicker';
import LaunchMark from './components/LaunchMark';
import Reveal from './components/Reveal';
import Button from './components/Button';
import { loadProfile, saveProfile } from './storage';
import { colors, space } from './theme';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(defaultAvatar);
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

  function editProfile() {
    setName(profile.name);
    setAvatarId(Object.hasOwn(avatars, profile.avatarId) ? profile.avatarId : defaultAvatar);
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
      avatarId,
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
  const form = (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formPage}>
          <Reveal style={styles.form}>
            <View style={styles.mark}><Avatar id={avatarId} size={64} /></View>
            <Text accessibilityRole="header" style={styles.title}>{profile ? 'Edit profile' : 'Create your profile'}</Text>
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
            />
            <AvatarPicker value={avatarId} onChange={setAvatarId} disabled={saving} />
            {saveError && <Text style={styles.error}>Couldn’t save your profile. Try again.</Text>}
            <Button primary title="Save" onPress={submit} disabled={!name.trim() || saving} />
            {profile && <Button title="Cancel" onPress={close} disabled={saving} />}
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <UserContext.Provider value={{ profile, editProfile }}>
      {profile ? children : loading ? <LaunchMark /> : loadError ? (
        <View style={styles.center}>
          <Button title="Retry loading profile" onPress={() => {
            setLoading(true);
            setLoadError(false);
            void restore();
          }} />
        </View>
      ) : form}
      {profile && editing && <Modal visible onRequestClose={close}>{form}</Modal>}
    </UserContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: space.lg },
  formPage: { flexGrow: 1, justifyContent: 'center', padding: space.page },
  mark: { alignSelf: 'center' },
  form: { width: '100%', maxWidth: space.maxBoard, alignSelf: 'center', gap: space.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  input: { minHeight: space.tap, padding: space.md, borderRadius: space.radius, backgroundColor: colors.paper, borderWidth: space.hairline, borderColor: colors.border, color: colors.text },
  error: { color: colors.error },
});
