import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const COLORS = {
  background: '#FDF8F3',
  card: '#FFFFFF',
  maroon: '#8B1538',
  gold: '#C9A050',
  goldLight: '#F5E6C8',
  cream: '#FAF3E8',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
};

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: 'orders' | 'menu' | 'wallet' | 'delivery' | 'notifications' | 'search' | 'error';
}

const illustrations = {
  orders: { icon: 'receipt-outline', bgColor: '#FFF3E0', iconColor: '#E65100' },
  menu: { icon: 'restaurant-outline', bgColor: '#E8F5E9', iconColor: '#2E7D32' },
  wallet: { icon: 'wallet-outline', bgColor: '#E3F2FD', iconColor: '#1565C0' },
  delivery: { icon: 'bicycle-outline', bgColor: '#FCE4EC', iconColor: '#C41E3A' },
  notifications: { icon: 'notifications-outline', bgColor: '#F3E5F5', iconColor: '#7B1FA2' },
  search: { icon: 'search-outline', bgColor: '#E0F7FA', iconColor: '#00838F' },
  error: { icon: 'alert-circle-outline', bgColor: '#FFEBEE', iconColor: '#C41E3A' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  illustration = 'orders',
}) => {
  const illust = illustrations[illustration];
  const displayIcon = icon || (illust.icon as keyof typeof Ionicons.glyphMap);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <Animated.View 
        entering={FadeInUp.delay(100).springify()} 
        style={[styles.iconContainer, { backgroundColor: illust.bgColor }]}
      >
        <Ionicons name={displayIcon} size={48} color={illust.iconColor} />
      </Animated.View>
      
      <Animated.Text entering={FadeInUp.delay(200).springify()} style={styles.title}>
        {title}
      </Animated.Text>
      
      <Animated.Text entering={FadeInUp.delay(300).springify()} style={styles.message}>
        {message}
      </Animated.Text>
      
      {actionLabel && onAction && (
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAction();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;
