import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInUp,
  ZoomIn,
  BounceIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Re-export entering animations for easy use
export {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInDown,
  SlideInUp,
  ZoomIn,
  BounceIn,
};

// Animated Card with stagger effect
interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle;
  onPress?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, index = 0, style, onPress }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <Animated.View
          entering={FadeInDown.delay(index * 80).springify().damping(15)}
          style={[style, animatedStyle]}
        >
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(15)}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

// Pulsing dot for status indicators
interface PulsingDotProps {
  color: string;
  size?: number;
  isActive?: boolean;
}

export const PulsingDot: React.FC<PulsingDotProps> = ({ color, size = 12, isActive = true }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = 1;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.3], [1, 0.6]),
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

// Animated progress bar
interface AnimatedProgressProps {
  progress: number; // 0 to 1
  color: string;
  backgroundColor?: string;
  height?: number;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  progress,
  color,
  backgroundColor = '#E0E0E0',
  height = 6,
}) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(progress, { damping: 20, stiffness: 100 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={{ height, backgroundColor, borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { height: '100%', backgroundColor: color, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
};

// Animated counter for stats
interface AnimatedCounterProps {
  value: number;
  style?: TextStyle;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  style,
  prefix = '',
  suffix = '',
}) => {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 1000, easing: Easing.out(Easing.cubic) });
    
    // Update display value
    const interval = setInterval(() => {
      setDisplayValue(prev => {
        const diff = value - prev;
        if (Math.abs(diff) < 1) {
          clearInterval(interval);
          return value;
        }
        return prev + diff * 0.1;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <Text style={style}>
      {prefix}{Math.round(displayValue)}{suffix}
    </Text>
  );
};

// Skeleton loader
interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// Skeleton card loader
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[{ padding: 16, gap: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={60} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>
    </View>
  );
};

// Animated button with haptic feedback
interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  icon,
  disabled = false,
  variant = 'primary',
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { bg: '#F5F5F5', text: '#333' };
      case 'outline':
        return { bg: 'transparent', text: '#8B1538', border: '#8B1538' };
      case 'danger':
        return { bg: '#FF3B30', text: '#FFF' };
      default:
        return { bg: '#8B1538', text: '#F5E6C8' };
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: variantStyle.bg,
            borderWidth: variant === 'outline' ? 2 : 0,
            borderColor: variantStyle.border,
            opacity: disabled ? 0.5 : 1,
            gap: 8,
          },
          animatedStyle,
          style,
        ]}
      >
        {icon}
        <Text
          style={[
            {
              fontSize: 16,
              fontWeight: '600',
              color: variantStyle.text,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Success checkmark animation
export const SuccessCheckmark: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = '#2E7D32',
}) => {
  const scale = useSharedValue(0);
  const checkProgress = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    checkProgress.value = withDelay(200, withTiming(1, { duration: 400 }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        },
        circleStyle,
      ]}
    >
      <Animated.View entering={ZoomIn.delay(300)}>
        <Text style={{ fontSize: size * 0.5, color: '#FFF' }}>✓</Text>
      </Animated.View>
    </Animated.View>
  );
};

// Floating action button with animation
interface FABProps {
  icon: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  backgroundColor?: string;
}

export const FloatingActionButton: React.FC<FABProps> = ({
  icon,
  onPress,
  style,
  backgroundColor = '#8B1538',
}) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(500, withSpring(1, { damping: 12 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <Animated.View
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
          animatedStyle,
          style,
        ]}
      >
        {icon}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Swipe to confirm
interface SwipeToConfirmProps {
  onConfirm: () => void;
  label: string;
  confirmLabel?: string;
  backgroundColor?: string;
  thumbColor?: string;
}

export const SwipeToConfirm: React.FC<SwipeToConfirmProps> = ({
  onConfirm,
  label,
  confirmLabel = 'Confirmed!',
  backgroundColor = '#E8F5E9',
  thumbColor = '#2E7D32',
}) => {
  const translateX = useSharedValue(0);
  const [confirmed, setConfirmed] = React.useState(false);
  const maxSwipe = 280;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, maxSwipe * 0.5], [1, 0]),
  }));

  return (
    <View
      style={{
        height: 56,
        backgroundColor,
        borderRadius: 28,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Animated.Text
        style={[
          {
            position: 'absolute',
            alignSelf: 'center',
            fontSize: 16,
            fontWeight: '600',
            color: thumbColor,
          },
          textOpacity,
        ]}
      >
        {confirmed ? confirmLabel : label}
      </Animated.Text>
      <Animated.View
        style={[
          {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: thumbColor,
            marginLeft: 4,
            alignItems: 'center',
            justifyContent: 'center',
          },
          thumbStyle,
        ]}
      >
        <Text style={{ color: '#FFF', fontSize: 20 }}>→</Text>
      </Animated.View>
    </View>
  );
};

export default {
  AnimatedCard,
  PulsingDot,
  AnimatedProgress,
  AnimatedCounter,
  Skeleton,
  SkeletonCard,
  AnimatedButton,
  SuccessCheckmark,
  FloatingActionButton,
  SwipeToConfirm,
};
