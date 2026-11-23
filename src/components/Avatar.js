import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export const avatars = {
  orbit: { name: 'Orbit', background: colors.arcadeViolet, face: colors.paper, detail: 'antenna' },
  pixel: { name: 'Pixel', background: colors.arcadeLime, face: colors.arcade, detail: 'visor' },
  comet: { name: 'Comet', background: colors.arcadeBlue, face: colors.skyInk, detail: 'trail' },
  nova: { name: 'Nova', background: colors.arcadePink, face: colors.peachInk, detail: 'spark' },
  bolt: { name: 'Bolt', background: colors.arcadeAmber, face: colors.arcade, detail: 'bolt' },
  echo: { name: 'Echo', background: colors.selected, face: colors.accent, detail: 'ears' },
};

export const defaultAvatar = 'orbit';

export default function Avatar({ id, size = 44 }) {
  const avatar = avatars[Object.hasOwn(avatars, id) ? id : defaultAvatar];
  const unit = size / 24;
  const ink = avatar.face === colors.paper ? colors.arcade : colors.paper;
  const part = (x, y, width, height, backgroundColor, radius = 0) => ({
    left: x * unit, top: y * unit, width: width * unit, height: height * unit,
    backgroundColor, borderRadius: radius * unit,
  });
  const detail = avatar.detail;

  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.background }]}>
      {detail === 'trail' && <View style={[styles.part, part(2, 13, 10, 2.4, colors.paper, 1)]} />}
      {detail === 'ears' && <View style={[styles.part, part(4, 5, 5, 7, avatar.face, 2), styles.leftEar]} />}
      {detail === 'ears' && <View style={[styles.part, part(15, 5, 5, 7, avatar.face, 2), styles.rightEar]} />}
      {detail === 'antenna' && <View style={[styles.part, part(11.3, 4, 1.4, 5, colors.arcade, 0.7)]} />}
      {detail === 'antenna' && <View style={[styles.part, part(10.2, 2.8, 3.6, 3.6, colors.arcade, 1.8)]} />}
      <View style={[styles.part, part(5, 7.5, 14, 12, avatar.face, detail === 'visor' ? 2.5 : 5)]} />
      {detail === 'visor' ? <View style={[styles.part, part(7.5, 11, 9, 3, colors.arcadeLime, 1.5)]} /> : (
        <>
          <View style={[styles.part, part(8.4, 11.6, 1.8, 2.4, ink, 1)]} />
          <View style={[styles.part, part(13.8, 11.6, 1.8, 2.4, ink, 1)]} />
        </>
      )}
      <View style={[styles.part, part(11, 15.5, 2, 1.25, ink, 0.7)]} />
      {detail === 'spark' && <View style={[styles.part, part(17, 5, 3.7, 3.7, colors.paper, 0.6), styles.spark]} />}
      {detail === 'bolt' && <View style={[styles.part, part(15.5, 4, 2.3, 5.5, colors.paper, 0.6), styles.bolt]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { flexShrink: 0, overflow: 'hidden' },
  part: { position: 'absolute' },
  leftEar: { transform: [{ rotate: '-20deg' }] },
  rightEar: { transform: [{ rotate: '20deg' }] },
  spark: { transform: [{ rotate: '45deg' }] },
  bolt: { transform: [{ rotate: '31deg' }] },
});
