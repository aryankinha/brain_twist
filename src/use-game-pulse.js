import { useCallback, useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { useFeedback } from './feedback';

export function useGamePulse() {
  const { animate } = useFeedback();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!animate) pulse.setValue(1);
    return () => pulse.stopAnimation();
  }, [animate, pulse]);

  const bump = useCallback((from = 0.88) => {
    if (!animate) return;
    pulse.setValue(from);
    Animated.spring(pulse, {
      toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true, isInteraction: false,
    }).start();
  }, [animate, pulse]);

  return { pulse, bump };
}
