import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { loadPreferences, savePreferences } from './storage';

const defaults = { sound: false, haptics: true, animations: true };
const audioOptions = { downloadFirst: true };
const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [preferences, setPreferences] = useState(defaults);
  const preferencesRef = useRef(defaults);
  const saves = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [reduced, setReduced] = useState(true);
  const correct = useAudioPlayer(require('../assets/audio/correct.wav'), audioOptions);
  const wrong = useAudioPlayer(require('../assets/audio/wrong.wav'), audioOptions);
  const record = useAudioPlayer(require('../assets/audio/record.wav'), audioOptions);

  const tap = useAudioPlayer(require('../assets/audio/sequence-tone.wav'), audioOptions);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    loadPreferences().then((stored) => {
      preferencesRef.current = { ...defaults, ...stored };
      setPreferences(preferencesRef.current);
    })
      .catch(() => setSaveError(true)).finally(() => setLoaded(true));
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const playClip = useCallback((player, rate = null) => {
    if (!preferencesRef.current.sound) return;
    try {
      if (rate !== null) {
        player.shouldCorrectPitch = false;
        player.setPlaybackRate(rate);
      }
      const seek = player.seekTo(0);
      if (Platform.OS === 'web') {
        void seek.catch(() => {});
        player.play();
      } else {
        void seek.then(() => { if (preferencesRef.current.sound) player.play(); }).catch(() => {});
      }
    } catch {
      // An unavailable audio output should not interrupt gameplay.
    }
  }, []);

  const play = useCallback((kind, audible = true) => {
    if (preferencesRef.current.haptics) {
      const effect = kind === 'wrong' ? notificationAsync(NotificationFeedbackType.Error)
        : kind === 'record' ? notificationAsync(NotificationFeedbackType.Success)
        : impactAsync(ImpactFeedbackStyle.Light);
      void effect.catch(() => {});
    }
    if (audible) playClip(kind === 'tap' ? tap : kind === 'wrong' ? wrong : kind === 'record' ? record : correct);
  }, [correct, playClip, record, tap, wrong]);

  async function change(key, value) {
    const next = { ...preferencesRef.current, [key]: value };
    preferencesRef.current = next;
    setPreferences(next);
    setSaveError(false);
    if (key === 'sound') {
      if (value) playClip(correct);
      else [tap, correct, wrong, record].forEach((player) => player.pause());
    }
    try {
      const pending = saves.current.then(() => savePreferences(next));
      saves.current = pending.catch(() => {});
      await pending;
    } catch {
      setSaveError(true);
    }
  }

  return (
    <FeedbackContext.Provider value={{ preferences, loaded, saveError, change, play, playClip, animate: !reduced && preferences.animations }}>
      {children}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);
