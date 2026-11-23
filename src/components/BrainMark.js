import { View } from 'react-native';
import { colors } from '../theme';

const pixels = [
  '...ll..ll...',
  '..llbb.bll..',
  '.llbbb.bbbl.',
  '.lbbsbbsbbl.',
  'lbbss.bbssbl',
  'lbbbb.bbbbl.',
  '.lbbb.bbbbl.',
  '..lsbsbsbl..',
  '...llsll....',
  '.....ss.....',
];
const ink = { l: colors.brainLight, b: colors.brain, s: colors.brainShade };

export default function BrainMark({ size = 96 }) {
  const pixel = size / 12;
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pixels.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {Array.from(row, (color, x) => (
            <View key={x} style={{ width: pixel, height: pixel, backgroundColor: ink[color] }} />
          ))}
        </View>
      ))}
    </View>
  );
}
