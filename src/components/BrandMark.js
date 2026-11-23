import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function BrandMark({ size = 36 }) {
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Image source={require('../../assets/brain-twist-mark.png')} resizeMode="contain"
        style={{ width: size * 0.75, height: size * 0.75 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.arcade, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
