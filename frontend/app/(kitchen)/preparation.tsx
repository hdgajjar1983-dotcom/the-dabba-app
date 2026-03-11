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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { kitchenAPI } from '../../src/services/api';
import * as Haptics from 'expo-haptics';

const COLORS = {
  background: '#1A1A1A',
  card: '#242424',
  cardLight: '#2E2E2E',
  primary: '#C41E3A',
  gold: '#D4AF37',
  cream: '#F5F5DC',
  text: '#FFFFFF',
  textLight: '#A0A0A0',
  border: '#333333',
  success: '#10B981',
  warning: '#F59E0B',
};

interface CustomerItem {
  customer_id: string;
  customer_name: string;
  phone: string;
  address: string;
  plan: string;
  roti: number;
  sabji: number;
  dal: number;
  rice: number;
  salad: number;
  bread: number;
  notes: string;
  sequence_number?: number;
  expected_delivery?: string;
  dabba_ready?: boolean;
  delivery_id?: string;
}

interface Totals {
  total_customers: number;
  total_roti: number;
  total_sabji_portions: number;
  total_sabji_grams: number;
  total_sabji_kg: number;
  total_dal_portions: number;
  total_dal_grams: number;
  total_dal_kg: number;
  total_rice_portions: number;
  total_salad_portions: number;
  total_bread: number;
}

export default function PreparationScreen() {
  const [prepList, setPrepList] = useState<CustomerItem[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [date, setDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readyDabbas, setReadyDabbas] = useState<Set<string>>(new Set());

  const fetchPrepList = useCallback(async () => {
    try {
      const response = await kitchenAPI.getPreparationList();
      const list = response.data.preparation_list || [];
      // Add sequence numbers dynamically
      const numberedList = list.map((item: CustomerItem, idx: number) => ({
        ...item,
        sequence_number: idx + 1,
      }));
      setPrepList(numberedList);
      setTotals(response.data.totals || null);
      setDate(response.data.date || '');
    } catch (error) {
      console.error('Error fetching preparation list:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrepList();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPrepList, 30000);
    return () => clearInterval(interval);
  }, [fetchPrepList]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrepList();
  }, [fetchPrepList]);

  const handleMarkReady = async (customerId: string, deliveryId?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Toggle locally first for instant feedback
      setReadyDabbas(prev => {
        const newSet = new Set(prev);
        if (newSet.has(customerId)) {
          newSet.delete(customerId);
        } else {
          newSet.add(customerId);
        }
        return newSet;
      });

      // Sync to server - this notifies Driver portal
      if (deliveryId) {
        await kitchenAPI.markDabbaReady(deliveryId);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error marking dabba ready:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update dabba status');
      // Revert local state on error
      setReadyDabbas(prev => {
        const newSet = new Set(prev);
        if (newSet.has(customerId)) {
          newSet.delete(customerId);
        } else {
          newSet.add(customerId);
        }
        return newSet;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading preparation list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Preparation List</Text>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Totals Summary Card */}
        {totals && (
          <View style={styles.totalsCard}>
            <Text style={styles.totalsTitle}>
              <Ionicons name="calculator" size={18} color={COLORS.gold} /> Daily Totals
            </Text>
            
            <View style={styles.totalsGrid}>
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{totals.total_customers}</Text>
                <Text style={styles.totalLabel}>Customers</Text>
              </View>
              
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{totals.total_roti}</Text>
                <Text style={styles.totalLabel}>Rotis</Text>
              </View>
              
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{totals.total_bread}</Text>
                <Text style={styles.totalLabel}>Breads</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalsRow}>
              <View style={styles.totalItemLarge}>
                <Ionicons name="restaurant" size={20} color={COLORS.warning} />
                <View style={styles.totalInfo}>
                  <Text style={styles.totalLabel}>Sabji</Text>
                  <Text style={styles.totalValueLarge}>
                    {totals.total_sabji_portions} portions = {totals.total_sabji_kg} kg
                  </Text>
                  <Text style={styles.totalSubtext}>({totals.total_sabji_grams}g @ 227g each)</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.totalsRow}>
              <View style={styles.totalItemLarge}>
                <Ionicons name="water" size={20} color={COLORS.gold} />
                <View style={styles.totalInfo}>
                  <Text style={styles.totalLabel}>Dal</Text>
                  <Text style={styles.totalValueLarge}>
                    {totals.total_dal_portions} portions = {totals.total_dal_kg} kg
                  </Text>
                  <Text style={styles.totalSubtext}>({totals.total_dal_grams}g @ 227g each)</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.totalsRow}>
              <View style={styles.totalItemLarge}>
                <Ionicons name="leaf" size={20} color={COLORS.success} />
                <View style={styles.totalInfo}>
                  <Text style={styles.totalLabel}>Rice</Text>
                  <Text style={styles.totalValueLarge}>{totals.total_rice_portions} portions</Text>
                </View>
              </View>
              
              <View style={styles.totalItemLarge}>
                <Ionicons name="nutrition" size={20} color={COLORS.success} />
                <View style={styles.totalInfo}>
                  <Text style={styles.totalLabel}>Salad</Text>
                  <Text style={styles.totalValueLarge}>{totals.total_salad_portions} portions</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Customer List Table with Sequence & Ready Checkbox */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Customer-wise Breakdown</Text>
          <Text style={styles.tableSubtitle}>Tap checkbox when dabba is ready - syncs to Driver</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.seqCell]}>#</Text>
            <Text style={[styles.headerCell, styles.checkCell]}>Ready</Text>
            <Text style={[styles.headerCell, styles.nameCell]}>Customer</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Roti</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Sabji</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Dal</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Rice</Text>
          </View>
          
          {/* Table Rows */}
          {prepList.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No active customers for today</Text>
            </View>
          ) : (
            prepList.map((customer, index) => {
              const isReady = readyDabbas.has(customer.customer_id) || customer.dabba_ready;
              return (
                <View
                  key={customer.customer_id}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                    isReady && styles.rowReady,
                  ]}
                >
                  {/* Sequence Number */}
                  <View style={[styles.seqCell, styles.seqBadge]}>
                    <Text style={styles.seqText}>{customer.sequence_number || index + 1}</Text>
                  </View>
                  
                  {/* Ready Checkbox */}
                  <TouchableOpacity 
                    style={styles.checkCell}
                    onPress={() => handleMarkReady(customer.customer_id, customer.delivery_id)}
                  >
                    <View style={[styles.checkbox, isReady && styles.checkboxChecked]}>
                      {isReady && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                  
                  {/* Customer Info */}
                  <View style={[styles.nameCell]}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customer.customer_name}
                    </Text>
                    <Text style={styles.customerPlan}>{customer.plan}</Text>
                  </View>
                  
                  {/* Item Counts */}
                  <Text style={[styles.cell, styles.numCell, { fontWeight: '600', color: COLORS.cream }]}>
                    {customer.roti}
                  </Text>
                  <Text style={[styles.cell, styles.numCell, { fontWeight: '600', color: COLORS.cream }]}>
                    {customer.sabji}
                  </Text>
                  <Text style={[styles.cell, styles.numCell, { fontWeight: '600', color: COLORS.cream }]}>
                    {customer.dal}
                  </Text>
                  <Text style={[styles.cell, styles.numCell, { fontWeight: '600', color: COLORS.cream }]}>
                    {customer.rice}
                  </Text>
                </View>
              );
            })
          )}
          
          {/* Table Footer with Totals */}
          {totals && prepList.length > 0 && (
            <View style={styles.tableFooter}>
              <Text style={[styles.footerCell, styles.seqCell]}></Text>
              <Text style={[styles.footerCell, styles.checkCell]}></Text>
              <Text style={[styles.footerCell, styles.nameCell]}>TOTAL</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_roti}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_sabji_portions}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_dal_portions}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_rice_portions}</Text>
            </View>
          )}
        </View>
        
        {/* Weight Summary */}
        {totals && prepList.length > 0 && (
          <View style={styles.weightSummary}>
            <Text style={styles.weightTitle}>Weight Summary</Text>
            <View style={styles.weightRow}>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Sabji Required</Text>
                <Text style={styles.weightValue}>{totals.total_sabji_kg} kg</Text>
              </View>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Dal Required</Text>
                <Text style={styles.weightValue}>{totals.total_dal_kg} kg</Text>
              </View>
            </View>
            <Text style={styles.weightNote}>* Each portion = 227 grams</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textLight,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.cream,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.gold,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  totalsCard: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  totalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.cream,
    marginBottom: 16,
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.gold,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  totalItemLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  totalInfo: {
    marginLeft: 12,
    flex: 1,
  },
  totalValueLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.cream,
  },
  totalSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  tableCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.cream,
    padding: 16,
    paddingBottom: 4,
  },
  tableSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  seqCell: {
    width: 32,
    textAlign: 'center',
  },
  seqBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
  },
  checkCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  nameCell: {
    flex: 2,
    textAlign: 'left',
    paddingLeft: 8,
  },
  numCell: {
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: COLORS.card,
  },
  rowOdd: {
    backgroundColor: COLORS.cardLight,
  },
  rowReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  cell: {
    fontSize: 13,
    color: COLORS.text,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.cream,
  },
  customerPlan: {
    fontSize: 10,
    color: COLORS.gold,
    marginTop: 2,
  },
  numValue: {
    fontWeight: '600',
    color: COLORS.cream,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  footerCell: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  weightSummary: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  weightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.cream,
    marginBottom: 12,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weightItem: {
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  weightLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gold,
  },
  weightNote: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
});
