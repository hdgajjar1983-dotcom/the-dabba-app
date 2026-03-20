import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const toastConfig = {
  success: {
    icon: 'checkmark-circle' as const,
    bgColor: '#E8F5E9',
    borderColor: '#2E7D32',
    iconColor: '#2E7D32',
    textColor: '#1B5E20',
  },
  error: {
    icon: 'close-circle' as const,
    bgColor: '#FFEBEE',
    borderColor: '#C41E3A',
    iconColor: '#C41E3A',
    textColor: '#B71C1C',
  },
  warning: {
    icon: 'warning' as const,
    bgColor: '#FFF3E0',
    borderColor: '#E65100',
    iconColor: '#E65100',
    textColor: '#E65100',
  },
  info: {
    icon: 'information-circle' as const,
    bgColor: '#E3F2FD',
    borderColor: '#1565C0',
    iconColor: '#1565C0',
    textColor: '#0D47A1',
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 3000,
  onHide,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const config = toastConfig[type];

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => onHide?.(), 300);
  }, [onHide]);

  useEffect(() => {
    if (visible) {
      // Show toast
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      translateY.value = withSpring(60, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      
      // Auto hide
      const timer = setTimeout(hideToast, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, type]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.toast, { backgroundColor: config.bgColor, borderLeftColor: config.borderColor }]}>
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
        <Text style={[styles.message, { color: config.textColor }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginHorizontal: 20,
    maxWidth: SCREEN_WIDTH - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default Toast;
