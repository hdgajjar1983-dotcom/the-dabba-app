import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  maroon: '#8B1538',
  maroonDark: '#5D0E24',
  gold: '#D4AF37',
  goldLight: '#F4E4BA',
  cream: '#FDF8F3',
};

interface AnimatedSplashProps {
  onAnimationFinish?: () => void;
  autoPlay?: boolean;
}

export default function AnimatedSplash({ onAnimationFinish, autoPlay = true }: AnimatedSplashProps) {
  const lottieRef = useRef<LottieView>(null);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    if (autoPlay) {
      // Start text animation after logo animation begins
      textOpacity.value = withDelay(500, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
      textTranslateY.value = withDelay(500, withTiming(0, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));
      taglineOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));
      
      // Gold shimmer effect
      shimmerPosition.value = withDelay(
        800,
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 0 })
        )
      );

      // Notify when animation is complete
      if (onAnimationFinish) {
        setTimeout(onAnimationFinish, 3500);
      }
    }
  }, [autoPlay]);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Lottie Animation */}
      <View style={styles.lottieContainer}>
        <LottieView
          ref={lottieRef}
          source={require('../../assets/animations/dabba-splash.json')}
          style={styles.lottie}
          autoPlay={autoPlay}
          loop={true}
          speed={0.8}
        />
      </View>

      {/* App Name */}
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.appName}>THE DABBA</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
        <Text style={styles.tagline}>Premium Tiffin Service</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieContainer: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginTop: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.goldLight,
    letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  taglineContainer: {
    marginTop: 10,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.goldLight,
    opacity: 0.8,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
});
