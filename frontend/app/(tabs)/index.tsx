import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MenuItem {
  id: string;
  day: string;
  main_dish: string;
  accompaniments: string;
  is_special: boolean;
}

interface TimeCheck {
  can_modify: boolean;
  current_hour: number;
  message: string;
}

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [timeCheck, setTimeCheck] = useState<TimeCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch time check
      const timeRes = await fetch(`${BACKEND_URL}/api/time-check`);
      if (timeRes.ok) {
        setTimeCheck(await timeRes.json());
      }

      // Fetch menu
      const menuRes = await fetch(`${BACKEND_URL}/api/menu`);
      if (menuRes.ok) {
        setMenuItems(await menuRes.json());
      }

      await refreshUser();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser]);

  const seedData = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/seed`, { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Error seeding:', error);
    }
  };

  useEffect(() => {
    seedData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSkipToggle = async () => {
    if (!user) return;

    if (!timeCheck?.can_modify) {
      Alert.alert('Time Locked', "Cut-off time (10:00 PM) has passed. We've already started preparing your fresh meal!");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.user_id}/skip`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_skipping_tomorrow: !user.is_skipping_tomorrow }),
      });

      if (res.ok) {
        await refreshUser();
      } else {
        const error = await res.json();
        Alert.alert('Error', error.detail || 'Failed to update');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update skip status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9f1c" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name || 'Guest'}!</Text>
      </View>

      {/* Credit Display */}
      <View style={styles.creditCard}>
        <View style={styles.creditCardBg}>
          <Ionicons name="restaurant-outline" size={80} color="#1b4332" />
        </View>
        <Text style={styles.creditLabel}>Available Balance</Text>
        <View style={styles.creditRow}>
          <Text style={styles.creditNumber}>{user?.credits || 0}</Text>
          <Text style={styles.creditUnit}>Meals</Text>
        </View>

        {/* Tomorrow's Delivery */}
        <View style={styles.deliveryStatus}>
          <View>
            <Text style={styles.deliveryLabel}>Tomorrow's Delivery</Text>
            <Text style={[styles.deliveryValue, user?.is_skipping_tomorrow ? styles.statusPaused : styles.statusActive]}>
              {user?.is_skipping_tomorrow ? 'PAUSED / SKIPPED' : 'ON THE WAY'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.skipButton, user?.is_skipping_tomorrow ? styles.resumeButton : styles.pauseButton]}
            onPress={handleSkipToggle}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.skipButtonText, user?.is_skipping_tomorrow && styles.resumeButtonText]}>
                {user?.is_skipping_tomorrow ? 'RESUME' : 'SKIP TOMORROW'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {!timeCheck?.can_modify && (
          <View style={styles.timeWarning}>
            <Ionicons name="time-outline" size={12} color="#ef4444" />
            <Text style={styles.timeWarningText}>Changes locked after 10 PM</Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.userInfoCard}>
        <View style={styles.userInfoRow}>
          <Ionicons name="location-outline" size={20} color="#1b4332" />
          <Text style={styles.userInfoText}>{user?.address || 'No address set'}</Text>
        </View>
        <View style={styles.userInfoRow}>
          <Ionicons name="leaf-outline" size={20} color="#1b4332" />
          <Text style={styles.userInfoText}>{user?.plan_type || 'Standard Veg'}</Text>
        </View>
      </View>

      {/* Weekly Menu */}
      <Text style={styles.sectionTitle}>This Week's Menu</Text>
      <View style={styles.menuGrid}>
        {menuItems.slice(0, 4).map((item) => (
          <View key={item.id} style={[styles.menuCard, item.is_special && styles.menuCardSpecial]}>
            <Text style={[styles.menuDay, item.is_special && styles.menuDaySpecial]}>
              {item.is_special ? `${item.day.toUpperCase()} SPECIAL` : item.day.toUpperCase()}
            </Text>
            <Text style={styles.menuDish}>{item.main_dish}</Text>
            <Text style={styles.menuSide}>+ {item.accompaniments}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },

  welcomeCard: { marginBottom: 16 },
  welcomeText: { fontSize: 14, color: '#6b7280' },
  userName: { fontSize: 24, fontWeight: '800', color: '#1b4332' },

  creditCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  creditCardBg: { position: 'absolute', top: 16, right: 16, opacity: 0.08 },
  creditLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  creditRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  creditNumber: { fontSize: 52, fontWeight: '900', color: '#1b4332' },
  creditUnit: { fontSize: 16, fontWeight: '500', color: '#9ca3af' },

  deliveryStatus: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
  },
  deliveryLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  deliveryValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  statusActive: { color: '#16a34a' },
  statusPaused: { color: '#ef4444' },

  skipButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  pauseButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ef4444' },
  resumeButton: { backgroundColor: '#16a34a' },
  skipButtonText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  resumeButtonText: { color: '#fff' },

  timeWarning: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  timeWarningText: { fontSize: 10, color: '#ef4444' },

  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userInfoText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1b4332', marginBottom: 12 },

  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '48%',
  },
  menuCardSpecial: { backgroundColor: '#fff9f0', borderColor: '#fed7aa' },
  menuDay: { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 4 },
  menuDaySpecial: { color: '#ea580c' },
  menuDish: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  menuSide: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
