import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { walletAPI } from '../../src/services/api';
import { Skeleton, EmptyState } from '../../src/components';

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
  error: '#C41E3A',
};

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
}

interface Wallet {
  balance: number;
  transactions: Transaction[];
}

export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const response = await walletAPI.getWallet();
      setWallet(response.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchWallet();
  }, [fetchWallet]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return 'arrow-down-circle';
      case 'debit':
        return 'arrow-up-circle';
      case 'skip_credit':
        return 'close-circle';
      default:
        return 'swap-horizontal';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Wallet</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={180} borderRadius={20} style={{ marginBottom: 24 }} />
          <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.subtitle}>Your meal credits and transactions</Text>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet" size={32} color={COLORS.goldLight} />
          </View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${wallet?.balance?.toFixed(2) || '0.00'} CAD</Text>
          <View style={styles.balanceInfo}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.goldLight} />
            <Text style={styles.balanceInfoText}>Skip meals to earn credits</Text>
          </View>
        </Animated.View>

        {/* Transactions */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {wallet?.transactions && wallet.transactions.length > 0 ? (
            wallet.transactions.map((transaction, index) => (
              <Animated.View 
                key={transaction.id} 
                entering={FadeInDown.delay(250 + index * 50).springify()}
                style={styles.transactionCard}
              >
                <View style={[
                  styles.transactionIcon,
                  transaction.type.includes('credit') ? styles.iconCredit : styles.iconDebit
                ]}>
                  <Ionicons
                    name={getTransactionIcon(transaction.type) as any}
                    size={24}
                    color={transaction.type.includes('credit') ? COLORS.success : COLORS.error}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.type.includes('credit') ? styles.amountCredit : styles.amountDebit
                ]}>
                  {transaction.type.includes('credit') ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                </Text>
              </Animated.View>
            ))
          ) : (
            <EmptyState
              illustration="wallet"
              title="No transactions yet"
              message="Skip meals to start earning credits!"
            />
          )}
        </Animated.View>

        {/* How it works */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="close-circle-outline" size={24} color="#E65100" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Skip a meal</Text>
                <Text style={styles.infoText}>Don&apos;t need lunch or dinner? Skip it!</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="wallet-outline" size={24} color={COLORS.success} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Get $12 CAD credit</Text>
                <Text style={styles.infoText}>Each skipped meal adds $12 to your wallet</Text>
              </View>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="card-outline" size={24} color="#1565C0" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Use for renewal</Text>
                <Text style={styles.infoText}>Credits applied to your next subscription</Text>
              </View>
            </View>
          </View>
        </Animated.View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
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
  balanceCard: {
    backgroundColor: COLORS.maroon,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 44,
    fontWeight: '700',
    color: COLORS.goldLight,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceInfoText: {
    fontSize: 12,
    color: COLORS.goldLight,
    opacity: 0.9,
  },
  transactionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCredit: {
    backgroundColor: '#E8F5E9',
  },
  iconDebit: {
    backgroundColor: '#FFEBEE',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountCredit: {
    color: COLORS.success,
  },
  amountDebit: {
    color: COLORS.error,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});
