import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { kitchenAPI } from '../../src/services/api';

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

  const fetchPrepList = useCallback(async () => {
    try {
      const response = await kitchenAPI.getPreparationList();
      setPrepList(response.data.preparation_list || []);
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
  }, [fetchPrepList]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrepList();
  }, [fetchPrepList]);

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

        {/* Customer List Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Customer-wise Breakdown</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.nameCell]}>Customer</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Roti</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Sabji</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Dal</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Rice</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Salad</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Bread</Text>
          </View>
          
          {/* Table Rows */}
          {prepList.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No active customers for today</Text>
            </View>
          ) : (
            prepList.map((customer, index) => (
              <View
                key={customer.customer_id}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                ]}
              >
                <View style={[styles.nameCell]}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {customer.customer_name}
                  </Text>
                  <Text style={styles.customerPlan}>{customer.plan}</Text>
                </View>
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
                <Text style={[styles.cell, styles.numCell, { fontWeight: '600', color: COLORS.cream }]}>
                  {customer.salad}
                </Text>
                <Text style={[styles.cell, styles.numCell, { fontWeight: '600', color: COLORS.cream }]}>
                  {customer.bread}
                </Text>
              </View>
            ))
          )}
          
          {/* Table Footer with Totals */}
          {totals && prepList.length > 0 && (
            <View style={styles.tableFooter}>
              <Text style={[styles.footerCell, styles.nameCell]}>TOTAL</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_roti}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_sabji_portions}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_dal_portions}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_rice_portions}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_salad_portions}</Text>
              <Text style={[styles.footerCell, styles.numCell]}>{totals.total_bread}</Text>
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
