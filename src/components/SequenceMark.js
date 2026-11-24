import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const path = [12, 8, 5, 6, 3];
const inks = [colors.arcadeBlue, colors.arcadeViolet, colors.arcadePink, colors.arcadeAmber, colors.arcadeLime];
const coordinate = (index) => [20 + index % 4 * 20, 20 + Math.floor(index / 4) * 20];

export default function SequenceMark({ size }) {
  const unit = size / 100;
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }]}>
      {path.slice(1).map((index, step) => {
        const [x, y] = coordinate(index);
        const [fromX, fromY] = coordinate(path[step]);
        const length = Math.hypot(x - fromX, y - fromY);
        const angle = Math.atan2(y - fromY, x - fromX) * 180 / Math.PI;
        return <View key={index} style={[styles.trace, {
          left: (x + fromX - length) * unit / 2, top: (y + fromY - 2) * unit / 2,
          width: length * unit, height: Math.max(1, 2 * unit), transform: [{ rotate: `${angle}deg` }],
        }]} />;
      })}
      {Array.from({ length: 16 }, (_, index) => {
        const step = path.indexOf(index);
        const [x, y] = coordinate(index);
        const diameter = step < 0 ? 5 : step === path.length - 1 ? 13 : 10;
        return <View key={index} style={[styles.node, {
          width: diameter * unit, height: diameter * unit,
          left: (x - diameter / 2) * unit, top: (y - diameter / 2) * unit,
          borderRadius: diameter * unit / (step === 2 || step === path.length - 1 ? 4 : 2),
          backgroundColor: step < 0 ? colors.arcadeLine : inks[step],
          transform: [{ rotate: step === path.length - 1 ? '45deg' : '0deg' }],
        }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { backgroundColor: colors.arcade },
  trace: { position: 'absolute', backgroundColor: colors.arcadeViolet, opacity: 0.6 },
  node: { position: 'absolute' },
});
