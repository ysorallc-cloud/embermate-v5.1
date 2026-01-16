import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AURORA_CONFIGS, AuroraVariant } from '../../app/_theme/aurora-config';
import { Animation } from '../../app/_theme/theme-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  variant: AuroraVariant;
}

export const AuroraBackground: React.FC<Props> = ({ variant }) => {
  const hueOffset = useSharedValue(0);
  const config = AURORA_CONFIGS[variant];

  useEffect(() => {
    hueOffset.value = withRepeat(
      withTiming(Animation.aurora.hueShiftRange, {
        duration: Animation.aurora.duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,  // Infinite
      true // Reverse
    );
  }, []);

  const layer1Style = useAnimatedStyle(() => {
    const hue = config.baseHue1 + hueOffset.value * 0.1;
    return {
      backgroundColor: `hsla(${hue}, ${config.saturation1}%, ${config.lightness1}%, ${config.opacity1})`,
    };
  });

  const layer2Style = useAnimatedStyle(() => {
    const hue = config.baseHue2 + hueOffset.value * 0.1;
    return {
      backgroundColor: `hsla(${hue}, ${config.saturation2}%, ${config.lightness2}%, ${config.opacity2})`,
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -50,
            left: -SCREEN_WIDTH * 0.25,
            width: SCREEN_WIDTH * 1.5,
            height: 400,
            borderRadius: 200,
          },
          layer1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 30,
            left: SCREEN_WIDTH * 0.1,
            width: SCREEN_WIDTH * 0.8,
            height: 250,
            borderRadius: 125,
          },
          layer2Style,
        ]}
      />
    </View>
  );
};

export default AuroraBackground;
