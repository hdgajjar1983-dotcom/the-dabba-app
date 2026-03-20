import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { customerAPI } from '../../src/services/api';
import { EmptyState, StatusBadge, Skeleton } from '../../src/components';

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
  info: '#1565C0',
};

interface OrderItem {
  name: string;
  quantity: number;
  category: string;
}

interface Order {
  id: string;
  date: string;
  status: 'delivered' | 'pending' | 'preparing' | 'cancelled' | 'skipped' | 'failed';
  items: OrderItem[];
  delivery_time?: string;
  amount: number;
  rating?: 'yummy' | 'good' | 'bad';
  photo_available?: boolean;
}

const statusConfig = {
  delivered: { color: COLORS.success, bgColor: '#E8F5E9', label: 'Delivered', icon: 'checkmark-circle' },
  pending: { color: COLORS.warning, bgColor: '#FFF3E0', label: 'Pending', icon: 'time' },
  preparing: { color: COLORS.warning, bgColor: '#FFF3E0', label: 'Preparing', icon: 'restaurant' },
  cancelled: { color: COLORS.error, bgColor: '#FFEBEE', label: 'Cancelled', icon: 'close-circle' },
  skipped: { color: COLORS.textLight, bgColor: '#F5F5F5', label: 'Skipped', icon: 'remove-circle' },
  failed: { color: COLORS.error, bgColor: '#FFEBEE', label: 'Failed', icon: 'alert-circle' },
};

const ratingConfig = {
  yummy: { emoji: '😋', label: 'Yummy!' },
  good: { emoji: '👍', label: 'Good' },
  bad: { emoji: '👎', label: 'Not Great' },
};

// Order Card Component
const OrderCard = ({ order, onRate, index }: { order: Order; onRate: () => void; index: number }) => {
  const scale = useSharedValue(1);
  const status = statusConfig[order.status] || statusConfig.pending;
  
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

  const formattedDate = new Date(order.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const itemSummary = order.items.slice(0, 2).map(i => i.name).join(', ');
  const moreItems = order.items.length > 2 ? ` +${order.items.length - 2}` : '';

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        entering={FadeInDown.delay(index * 60).springify()}
        style={[styles.orderCard, animatedStyle]}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.gold} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            {order.delivery_time && (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                <Text style={styles.timeText}>
                  {new Date(order.delivery_time).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsText} numberOfLines={1}>
            {itemSummary}{moreItems}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <View style={styles.footerLeft}>
            {order.amount > 0 && (
              <Text style={styles.amountText}>${order.amount.toFixed(2)} CAD</Text>
            )}
            {order.rating && (
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingEmoji}>{ratingConfig[order.rating]?.emoji}</Text>
                <Text style={styles.ratingLabel}>{ratingConfig[order.rating]?.label}</Text>
              </View>
            )}
          </View>
          
          {order.status === 'delivered' && !order.rating && (
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

// Rating Modal
const RatingModal = ({ visible, onClose, onRate, date }: { 
  visible: boolean; 
  onClose: () => void; 
  onRate: (rating: string) => void;
  date: string;
}) => {
  if (!visible) return null;
  
  const ratings = [
    { value: 'yummy', emoji: '😋', label: 'Yummy!' },
    { value: 'good', emoji: '👍', label: 'Good' },
    { value: 'bad', emoji: '👎', label: 'Not Great' },
  ];

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn} style={styles.modalContent}>
          <Text style={styles.modalTitle}>Rate Your Meal</Text>
          <Text style={styles.modalSubtitle}>{formattedDate}</Text>
          
          <View style={styles.ratingOptions}>
            {ratings.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={styles.ratingOption}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onRate(r.value);
                }}
              >
                <Text style={styles.ratingOptionEmoji}>{r.emoji}</Text>
                <Text style={styles.ratingOptionLabel}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Stats Card
const StatsCard = ({ delivered, skipped }: { delivered: number; skipped: number }) => (
  <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsCard}>
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
      </View>
      <Text style={styles.statValue}>{delivered}</Text>
      <Text style={styles.statLabel}>Delivered</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: '#F5F5F5' }]}>
        <Ionicons name="remove-circle" size={20} color={COLORS.textLight} />
      </View>
      <Text style={styles.statValue}>{skipped}</Text>
      <Text style={styles.statLabel}>Skipped</Text>
    </View>
  </Animated.View>
);

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ delivered: 0, skipped: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderDate, setSelectedOrderDate] = useState<string>('');

  const fetchHistory = useCallback(async () => {
    try {
      const response = await customerAPI.getOrderHistory(30);
      setOrders(response.data.orders || []);
      setStats({
        delivered: response.data.total_delivered || 0,
        skipped: response.data.total_skipped || 0,
      });
    } catch (error) {
      console.error('Error fetching order history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchHistory();
  }, [fetchHistory]);

  const handleRate = (date: string) => {
    setSelectedOrderDate(date);
    setShowRatingModal(true);
  };

  const submitRating = async (rating: string) => {
    try {
      await customerAPI.rateMeal({
        date: selectedOrderDate,
        rating,
      });
      setShowRatingModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.date === selectedOrderDate ? { ...o, rating: rating as any } : o
      ));
      
      Alert.alert('Thank you!', 'Your feedback helps us improve.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Order History</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="100%" height={120} borderRadius={16} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onRate={submitRating}
        date={selectedOrderDate}
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Order History</Text>
          <Text style={styles.subtitle}>Your recent meals and deliveries</Text>
        </Animated.View>

        {/* Stats */}
        {(stats.delivered > 0 || stats.skipped > 0) && (
          <StatsCard delivered={stats.delivered} skipped={stats.skipped} />
        )}

        {/* Orders List */}
        {orders.length > 0 ? (
          <View style={styles.ordersList}>
            {orders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onRate={() => handleRate(order.date)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            illustration="orders"
            title="No orders yet"
            message="Your meal history will appear here once you start receiving deliveries."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  loadingContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  skeletonCard: {
    marginBottom: 12,
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  // Orders List
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    backgroundColor: COLORS.cream,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  itemsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
  },
  orderFooter: {
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
  ratingDisplay: {
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
  ratingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.warning,
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  ratingOption: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.cream,
    minWidth: 85,
  },
  ratingOptionEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  ratingOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalClose: {
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
});
