import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings?: string;
  is_popular: boolean;
}

interface Transaction {
  id: string;
  credits_added: number;
  amount_paid: number;
  package_name: string;
  status: string;
  created_at: string;
}

export default function CreditsScreen() {
  const { user, refreshUser } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [packagesRes, transactionsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/credit-packages`),
        user?.user_id ? fetch(`${BACKEND_URL}/api/credit-history/${user.user_id}`) : Promise.resolve(null),
      ]);

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.packages);
      }

      if (transactionsRes?.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user?.user_id) {
      Alert.alert('Error', 'Please log in to purchase credits');
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Purchase ${pkg.credits} credits for $${pkg.price.toFixed(2)}?\n\n(This is a demo - no real payment will be processed)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setPurchasing(pkg.id);
            try {
              const res = await fetch(`${BACKEND_URL}/api/purchase-credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_id: pkg.id, user_id: user.user_id }),
              });

              if (res.ok) {
                const data = await res.json();
                Alert.alert('Success!', data.message);
                await refreshUser();
                await fetchData();
              } else {
                const error = await res.json();
                Alert.alert('Error', error.detail || 'Purchase failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Purchase failed');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9f1c" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Current Balance */}
      <View style={styles.balanceCard}>
        <Ionicons name="wallet" size={32} color="#ff9f1c" />
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>{user?.credits || 0} Meals</Text>
        </View>
      </View>

      {/* Packages */}
      <Text style={styles.sectionTitle}>Buy More Credits</Text>
      <View style={styles.packagesContainer}>
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[styles.packageCard, pkg.is_popular && styles.packageCardPopular]}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing === pkg.id}
          >
            {pkg.is_popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}
            <Text style={styles.packageName}>{pkg.name}</Text>
            <View style={styles.packageCreditsRow}>
              <Text style={styles.packageCredits}>{pkg.credits}</Text>
              <Text style={styles.packageCreditsLabel}>meals</Text>
            </View>
            <Text style={styles.packagePrice}>${pkg.price.toFixed(2)}</Text>
            {pkg.savings && <Text style={styles.packageSavings}>{pkg.savings}</Text>}
            <View style={[styles.buyButton, pkg.is_popular && styles.buyButtonPopular]}>
              {purchasing === pkg.id ? (
                <ActivityIndicator size="small" color={pkg.is_popular ? '#fff' : '#1b4332'} />
              ) : (
                <Text style={[styles.buyButtonText, pkg.is_popular && styles.buyButtonTextPopular]}>Buy Now</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Purchase History</Text>
          <View style={styles.historyContainer}>
            {transactions.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{tx.package_name}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyAmount}>
                  <Text style={styles.historyCredits}>+{tx.credits_added}</Text>
                  <Text style={styles.historyPrice}>${tx.amount_paid.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Demo Notice */}
      <View style={styles.demoNotice}>
        <Ionicons name="information-circle" size={20} color="#6b7280" />
        <Text style={styles.demoText}>
          This is a demo. No real payments are processed. Credits are added instantly.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },

  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b4332',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    gap: 16,
  },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332', marginBottom: 16 },

  packagesContainer: { gap: 12, marginBottom: 24 },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  packageCardPopular: { borderColor: '#ff9f1c', borderWidth: 2 },
  popularBadge: {
    backgroundColor: '#ff9f1c',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  packageName: { fontSize: 16, fontWeight: '600', color: '#374151' },
  packageCreditsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  packageCredits: { fontSize: 36, fontWeight: '900', color: '#1b4332' },
  packageCreditsLabel: { fontSize: 14, color: '#6b7280', marginLeft: 4 },
  packagePrice: { fontSize: 18, fontWeight: '700', color: '#1b4332', marginTop: 8 },
  packageSavings: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 4 },
  buyButton: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buyButtonPopular: { backgroundColor: '#1b4332' },
  buyButtonText: { fontSize: 14, fontWeight: '700', color: '#1b4332' },
  buyButtonTextPopular: { color: '#fff' },

  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyIcon: { marginRight: 12 },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  historyDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  historyAmount: { alignItems: 'flex-end' },
  historyCredits: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  historyPrice: { fontSize: 12, color: '#6b7280' },

  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  demoText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },
});
