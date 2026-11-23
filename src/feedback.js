import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { loadPreferences, savePreferences } from './storage';

const defaults = { sound: false, haptics: true, animations: true };
const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [preferences, setPreferences] = useState(defaults);
  const preferencesRef = useRef(defaults);
  const saves = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [reduced, setReduced] = useState(true);
  const correct = useAudioPlayer(require('../assets/audio/correct.wav'));
  const wrong = useAudioPlayer(require('../assets/audio/wrong.wav'));
  const record = useAudioPlayer(require('../assets/audio/record.wav'));

  useEffect(() => {
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

  const play = useCallback((kind) => {
    if (preferences.haptics) {
      const effect = kind === 'wrong' ? notificationAsync(NotificationFeedbackType.Error)
        : kind === 'record' ? notificationAsync(NotificationFeedbackType.Success)
        : impactAsync(ImpactFeedbackStyle.Light);
      effect.catch(() => {});
    }
    if (preferences.sound && kind !== 'tap') {
      const player = kind === 'wrong' ? wrong : kind === 'record' ? record : correct;
      player.seekTo(0).then(() => player.play()).catch(() => {});
    }
  }, [correct, preferences.haptics, preferences.sound, record, wrong]);

  async function change(key, value) {
    const next = { ...preferencesRef.current, [key]: value };
    preferencesRef.current = next;
    setPreferences(next);
    setSaveError(false);
    try {
      const pending = saves.current.then(() => savePreferences(next));
      saves.current = pending.catch(() => {});
      await pending;
    } catch {
      setSaveError(true);
    }
  }

  return (
    <FeedbackContext.Provider value={{ preferences, loaded, saveError, change, play, animate: !reduced && preferences.animations }}>
      {children}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);
