import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { StatusBadge } from './StatusBadge';

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
  success: '#2E7D32',
  warning: '#E65100',
  error: '#C41E3A',
};

interface OrderItem {
  name: string;
  quantity: number;
  category?: string;
}

interface OrderHistoryCardProps {
  id: string;
  date: string;
  items: OrderItem[];
  status: 'delivered' | 'pending' | 'preparing' | 'cancelled' | 'skipped';
  deliveryTime?: string;
  amount?: number;
  rating?: 'yummy' | 'good' | 'bad';
  onPress?: () => void;
  onRate?: () => void;
  index?: number;
}

const statusMap = {
  delivered: 'success' as const,
  pending: 'pending' as const,
  preparing: 'warning' as const,
  cancelled: 'error' as const,
  skipped: 'inactive' as const,
};

const ratingEmoji = {
  yummy: '😋',
  good: '👍',
  bad: '👎',
};

export const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({
  id,
  date,
  items,
  status,
  deliveryTime,
  amount,
  rating,
  onPress,
  onRate,
  index = 0,
}) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const itemSummary = items.slice(0, 3).map(i => i.name).join(', ');
  const moreItems = items.length > 3 ? ` +${items.length - 3} more` : '';

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        entering={FadeInDown.delay(index * 80).springify()}
        style={[styles.card, animatedStyle]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.gold} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            {deliveryTime && (
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                <Text style={styles.timeText}>{deliveryTime}</Text>
              </View>
            )}
          </View>
          <StatusBadge status={statusMap[status]} label={status.charAt(0).toUpperCase() + status.slice(1)} size="small" />
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsText} numberOfLines={2}>
            {itemSummary}{moreItems}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {amount && (
              <Text style={styles.amountText}>${amount.toFixed(2)} CAD</Text>
            )}
            {rating && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingEmoji}>{ratingEmoji[rating]}</Text>
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            )}
          </View>
          
          {status === 'delivered' && !rating && onRate && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRate();
              }}
            >
              <Text style={styles.rateButtonText}>Rate</Text>
              <Ionicons name="star" size={14} color={COLORS.maroon} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  itemsContainer: {
    backgroundColor: COLORS.cream,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  itemsText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  ratingEmoji: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E65100',
    textTransform: 'capitalize',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.maroon,
  },
});

export default OrderHistoryCard;
