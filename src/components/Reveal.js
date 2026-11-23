import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useFeedback } from '../feedback';
import { motion, space } from '../theme';

export default function Reveal({ children, style = undefined }) {
  const feedback = useFeedback();
  const animate = feedback?.animate;
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!animate) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: motion.enter, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, progress]);

  return (
    <Animated.View style={[style, {
      opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [space.sm, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}
