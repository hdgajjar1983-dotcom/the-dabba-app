import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Alert,
  Modal,
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
  blue: '#1976D2',
};

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  plan: string;
  delivery_address: string;
  status: string;
  delivery_number?: number;
  skipped: boolean;
}

interface PrintLabel {
  delivery_number: number;
  customer_name: string;
  address: string;
  plan: string;
  phone: string;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLabels, setPrintLabels] = useState<PrintLabel[]>([]);

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
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = orders.filter(o => o.status === 'pending').map(o => o.id);
    setSelectedOrders(pendingIds);
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  const handleMarkReady = async () => {
    if (selectedOrders.length === 0) {
      Alert.alert('No Orders Selected', 'Please select orders to mark as ready.');
      return;
    }

    setIsMarkingReady(true);
    try {
      const response = await kitchenAPI.markOrdersReady(selectedOrders);
      if (response.data.orders) {
        setPrintLabels(response.data.orders);
        setShowPrintModal(true);
      }
      setSelectedOrders([]);
      fetchOrders();
      Alert.alert('Success', `${response.data.orders?.length || 0} orders marked as ready!`);
    } catch (error) {
      console.error('Error marking orders ready:', error);
      Alert.alert('Error', 'Failed to mark orders as ready. Please try again.');
    } finally {
      setIsMarkingReady(false);
    }
  };

  const handlePrintLabels = async () => {
    try {
      const response = await kitchenAPI.getPrintLabels();
      if (response.data.labels && response.data.labels.length > 0) {
        setPrintLabels(response.data.labels);
        setShowPrintModal(true);
      } else {
        Alert.alert('No Labels', 'No orders are ready for printing.');
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
      Alert.alert('Error', 'Failed to fetch print labels.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return COLORS.success;
      case 'ready': return COLORS.blue;
      case 'out_for_delivery': return COLORS.warning;
      case 'pending': return COLORS.textLight;
      case 'skipped': return COLORS.error;
      default: return COLORS.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'ready': return 'checkmark-done';
      case 'out_for_delivery': return 'bicycle';
      case 'pending': return 'time';
      case 'skipped': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const readyCount = orders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery').length;
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
            <Text style={[styles.statNumber, { color: COLORS.textLight }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={[styles.statNumber, { color: COLORS.blue }]}>{readyCount}</Text>
            <Text style={styles.statLabel}>Ready</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{deliveredCount}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.selectAllButton}
          onPress={selectedOrders.length > 0 ? clearSelection : selectAllPending}
        >
          <Ionicons 
            name={selectedOrders.length > 0 ? "close-circle" : "checkbox"} 
            size={18} 
            color={COLORS.maroon} 
          />
          <Text style={styles.selectAllText}>
            {selectedOrders.length > 0 ? `Clear (${selectedOrders.length})` : 'Select All Pending'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.printButton]}
            onPress={handlePrintLabels}
          >
            <Ionicons name="print" size={18} color={COLORS.card} />
            <Text style={styles.actionButtonText}>Print Labels</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.readyButton,
              selectedOrders.length === 0 && styles.disabledButton
            ]}
            onPress={handleMarkReady}
            disabled={selectedOrders.length === 0 || isMarkingReady}
          >
            {isMarkingReady ? (
              <ActivityIndicator size="small" color={COLORS.card} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color={COLORS.card} />
                <Text style={styles.actionButtonText}>Mark Ready</Text>
              </>
            )}
          </TouchableOpacity>
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
          orders.map((order) => (
            <TouchableOpacity 
              key={order.id} 
              style={[
                styles.orderCard,
                selectedOrders.includes(order.id) && styles.selectedCard,
                order.status !== 'pending' && styles.disabledCard
              ]}
              onPress={() => order.status === 'pending' && toggleOrderSelection(order.id)}
              disabled={order.status !== 'pending'}
            >
              <View style={styles.orderHeader}>
                {order.status === 'pending' && (
                  <View style={[
                    styles.checkbox,
                    selectedOrders.includes(order.id) && styles.checkedBox
                  ]}>
                    {selectedOrders.includes(order.id) && (
                      <Ionicons name="checkmark" size={16} color={COLORS.card} />
                    )}
                  </View>
                )}
                
                <View style={[
                  styles.orderNumber,
                  order.delivery_number ? styles.deliveryNumberBadge : null
                ]}>
                  <Text style={styles.orderNumberText}>
                    {order.delivery_number ? `#${order.delivery_number}` : '-'}
                  </Text>
                </View>
                
                <View style={styles.orderInfo}>
                  <Text style={styles.customerName}>{order.customer_name}</Text>
                  <Text style={styles.planText}>{order.plan} Plan</Text>
                </View>
                
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
                  <Ionicons name={getStatusIcon(order.status) as any} size={14} color={getStatusColor(order.status)} />
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {order.status.replace('_', ' ')}
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
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Print Labels Modal */}
      <Modal
        visible={showPrintModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Print Labels</Text>
            <TouchableOpacity onPress={() => setShowPrintModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.labelsContainer}>
            {printLabels.map((label, index) => (
              <View key={index} style={styles.labelCard}>
                <View style={styles.labelHeader}>
                  <View style={styles.deliveryBadge}>
                    <Text style={styles.deliveryNumberLarge}>#{label.delivery_number}</Text>
                  </View>
                </View>
                <View style={styles.labelContent}>
                  <Text style={styles.labelName}>{label.customer_name}</Text>
                  <Text style={styles.labelPlan}>{label.plan} Plan</Text>
                  <View style={styles.labelDivider} />
                  <Text style={styles.labelAddress}>{label.address}</Text>
                  <Text style={styles.labelPhone}>{label.phone}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Text style={styles.printInstructions}>
              Take a screenshot or use screen print (Ctrl+P / Cmd+P) to print labels
            </Text>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowPrintModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    color: COLORS.maroon,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  printButton: {
    backgroundColor: COLORS.blue,
  },
  readyButton: {
    backgroundColor: COLORS.success,
  },
  disabledButton: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5,
  },
  actionButtonText: {
    color: COLORS.card,
    fontSize: 13,
    fontWeight: '600',
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
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  selectedCard: {
    borderColor: COLORS.maroon,
    backgroundColor: `${COLORS.maroon}08`,
  },
  disabledCard: {
    opacity: 0.7,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.maroon,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: COLORS.maroon,
  },
  orderNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryNumberBadge: {
    backgroundColor: COLORS.maroon,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.card,
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  labelsContainer: {
    flex: 1,
    padding: 20,
  },
  labelCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.maroon,
  },
  labelHeader: {
    backgroundColor: COLORS.maroon,
    padding: 16,
    alignItems: 'center',
  },
  deliveryBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deliveryNumberLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  labelContent: {
    padding: 20,
    alignItems: 'center',
  },
  labelName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  labelPlan: {
    fontSize: 16,
    color: COLORS.maroon,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  labelDivider: {
    width: '80%',
    height: 2,
    backgroundColor: COLORS.gold,
    marginVertical: 16,
  },
  labelAddress: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  labelPhone: {
    fontSize: 18,
    color: COLORS.maroon,
    fontWeight: '600',
    marginTop: 12,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  printInstructions: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeModalButton: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: '700',
  },
});
