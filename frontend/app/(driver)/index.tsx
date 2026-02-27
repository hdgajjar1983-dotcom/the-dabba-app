import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { driverAPI } from '../../src/services/api';

const COLORS = {
  primary: '#EA580C',
  primaryLight: '#FFF7ED',
  background: '#FDFBF7',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
};

interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  meal_type: string;
  status: string;
  subscription_plan: string;
}

export default function DriverDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await driverAPI.getDeliveries();
      setDeliveries(response.data.deliveries || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleStatusUpdate = async (deliveryId: string, status: 'delivered' | 'failed') => {
    const statusText = status === 'delivered' ? 'delivered' : 'failed';
    
    Alert.alert(
      'Update Status',
      `Mark this delivery as ${statusText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingId(deliveryId);
            try {
              await driverAPI.updateDeliveryStatus(deliveryId, status);
              Alert.alert('Success', `Delivery marked as ${statusText}`);
              fetchDeliveries();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:?daddr=${encodedAddress}`,
      android: `google.navigation:q=${encodedAddress}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
    });
    Linking.openURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return COLORS.success;
      case 'failed':
        return COLORS.error;
      case 'pending':
        return COLORS.warning;
      default:
        return COLORS.textLight;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#D1FAE5';
      case 'failed':
        return '#FEE2E2';
      case 'pending':
        return '#FEF3C7';
      default:
        return COLORS.border;
    }
  };

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  const completedDeliveries = deliveries.filter(d => d.status !== 'pending');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Driver'}!</Text>
            <Text style={styles.subGreeting}>Today's delivery schedule</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{pendingDeliveries.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
              {deliveries.filter(d => d.status === 'delivered').length}
            </Text>
            <Text style={styles.summaryLabel}>Delivered</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
            <Text style={[styles.summaryNumber, { color: COLORS.error }]}>
              {deliveries.filter(d => d.status === 'failed').length}
            </Text>
            <Text style={styles.summaryLabel}>Failed</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>
              {pendingDeliveries.length}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>

        {/* Pending Deliveries */}
        {pendingDeliveries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Deliveries</Text>
            {pendingDeliveries.map((delivery) => (
              <View key={delivery.id} style={styles.deliveryCard}>
                <View style={styles.deliveryHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{delivery.customer_name}</Text>
                    <View style={[styles.planBadge, { backgroundColor: COLORS.primaryLight }]}>
                      <Text style={styles.planText}>{delivery.subscription_plan}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(delivery.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                      {delivery.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.mealTypeRow}>
                  <Ionicons 
                    name={delivery.meal_type === 'lunch' ? 'sunny' : 'moon'} 
                    size={16} 
                    color={delivery.meal_type === 'lunch' ? COLORS.warning : COLORS.primary} 
                  />
                  <Text style={styles.mealTypeText}>
                    {delivery.meal_type.charAt(0).toUpperCase() + delivery.meal_type.slice(1)}
                  </Text>
                </View>

                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={18} color={COLORS.textLight} />
                  <Text style={styles.addressText}>{delivery.address}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall(delivery.customer_phone)}
                  >
                    <Ionicons name="call" size={20} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNavigate(delivery.address)}
                  >
                    <Ionicons name="navigate" size={20} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>Navigate</Text>
                  </TouchableOpacity>
                </View>

                {/* Status Buttons */}
                <View style={styles.statusButtonRow}>
                  <TouchableOpacity
                    style={[styles.statusButton, styles.deliveredButton]}
                    onPress={() => handleStatusUpdate(delivery.id, 'delivered')}
                    disabled={updatingId === delivery.id}
                  >
                    {updatingId === delivery.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                        <Text style={styles.statusButtonText}>Delivered</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, styles.failedButton]}
                    onPress={() => handleStatusUpdate(delivery.id, 'failed')}
                    disabled={updatingId === delivery.id}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.white} />
                    <Text style={styles.statusButtonText}>Failed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Completed Deliveries */}
        {completedDeliveries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Today</Text>
            {completedDeliveries.map((delivery) => (
              <View key={delivery.id} style={[styles.deliveryCard, styles.completedCard]}>
                <View style={styles.deliveryHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{delivery.customer_name}</Text>
                    <Text style={styles.mealTypeSmall}>{delivery.meal_type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(delivery.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                      {delivery.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.addressContainer}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.addressTextSmall}>{delivery.address}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {deliveries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>No deliveries today</Text>
            <Text style={styles.emptyStateText}>Pull down to refresh</Text>
          </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  completedCard: {
    opacity: 0.8,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealTypeSmall: {
    fontSize: 12,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  addressTextSmall: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  deliveredButton: {
    backgroundColor: COLORS.success,
  },
  failedButton: {
    backgroundColor: COLORS.error,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
});
