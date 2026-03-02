import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { kitchenAPI } from '../../src/services/api';
import { BRAND_COLORS } from '../../src/components/DabbaLogo';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
  warning: '#E65100',
  error: '#C41E3A',
};

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  plan: string;
  delivery_address: string;
  status: string;
  skipped: boolean;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await kitchenAPI.getOrders();
      setOrders(response.data.orders || []);
      setDate(response.data.date || '');
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'skipped': return COLORS.textLight;
      default: return COLORS.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'skipped': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const skippedCount = orders.filter(o => o.status === 'skipped').length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.maroon} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Orders</Text>
          <Text style={styles.subtitle}>{date}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{deliveredCount}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={[styles.statNumber, { color: COLORS.textLight }]}>{skippedCount}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No orders for today</Text>
          </View>
        ) : (
          orders.map((order, index) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderNumber}>
                  <Text style={styles.orderNumberText}>#{index + 1}</Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.customerName}>{order.customer_name}</Text>
                  <Text style={styles.planText}>{order.plan} Plan</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
                  <Ionicons name={getStatusIcon(order.status) as any} size={14} color={getStatusColor(order.status)} />
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color={COLORS.maroon} />
                  <Text style={styles.detailText} numberOfLines={2}>{order.delivery_address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color={COLORS.maroon} />
                  <Text style={styles.detailText}>{order.customer_phone || 'No phone'}</Text>
                  {order.customer_phone && (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCall(order.customer_phone)}
                    >
                      <Ionicons name="call" size={16} color={COLORS.card} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  orderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  planText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  orderDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
