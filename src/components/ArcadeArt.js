import { StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../theme';

const art = {
  sudoku: { tiles: ['3', '', '8', '', '5', '', '1', '', '6'], fill: colors.arcadeViolet },
  lights: { tiles: ['', '●', '', '●', '●', '●', '', '●', ''], fill: colors.arcadeAmber },
  schulte: { tiles: ['8', '3', '6', '2', '1', '4', '7', '9', '5'], fill: colors.arcadeLime, target: 4 },
  sequence: { tiles: ['●', '■', '▲', '◆'], fill: colors.arcadeBlue },
  stroop: { tiles: ['R', 'B', 'G', 'Y'], fill: colors.arcadePink },
};

export default function ArcadeArt({ game, size = 76, card = false }) {
  const { tiles, fill, target } = art[game] ?? art.sudoku;
  const columns = tiles.length === 4 ? 2 : 3;
  const gap = 3;
  const cell = Math.floor((size - gap * (columns - 1)) / columns);
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.board, { width: cell * columns + gap * (columns - 1), gap }]}>
      {tiles.map((tile, index) => (
        <View key={index} style={[
          styles.tile, { width: cell, height: cell, backgroundColor: tile ? (card ? colors.paper : fill) : colors.arcadeLine },
          index === target && styles.target,
        ]}>
          <Text allowFontScaling={false} style={[styles.tileText, { fontSize: columns === 2 ? cell * 0.46 : cell * 0.57 }]}>{tile}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', transform: [{ rotate: '-9deg' }] },
  tile: { borderRadius: space.xs, alignItems: 'center', justifyContent: 'center' },
  target: { backgroundColor: colors.arcadeViolet },
  tileText: { color: colors.arcade, fontWeight: '900', includeFontPadding: false },
});
