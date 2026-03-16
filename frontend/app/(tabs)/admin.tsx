import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Subscriber {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  skip: boolean;
  plan_type: string;
  credits: number;
}

interface PrepStats {
  total_active: number;
  total_skipping: number;
  total_prep: number;
  total_expired: number;
}

interface TimeCheck {
  can_modify: boolean;
}

export default function AdminScreen() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [prepStats, setPrepStats] = useState<PrepStats | null>(null);
  const [timeCheck, setTimeCheck] = useState<TimeCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subsRes, statsRes, timeRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/subscribers`),
        fetch(`${BACKEND_URL}/api/prep-stats`),
        fetch(`${BACKEND_URL}/api/time-check`),
      ]);

      if (subsRes.ok) setSubscribers(await subsRes.json());
      if (statsRes.ok) setPrepStats(await statsRes.json());
      if (timeRes.ok) setTimeCheck(await timeRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleToggleSkip = async (subId: string) => {
    if (!timeCheck?.can_modify) {
      Alert.alert('Time Locked', 'Cut-off time (10:00 PM) has passed.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscribers/${subId}/skip`, { method: 'PATCH' });
      if (res.ok) {
        await fetchData();
      } else {
        Alert.alert('Error', 'Failed to toggle skip status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle skip status');
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kitchen Command</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live</Text>
        </View>
      </View>

      {/* Prep Card */}
      <View style={styles.prepCard}>
        <View style={styles.prepInfo}>
          <Text style={styles.prepLabel}>Tomorrow's Total Prep</Text>
          <View style={styles.prepNumberRow}>
            <Text style={styles.prepNumber}>{prepStats?.total_prep || 0}</Text>
            <Text style={styles.prepUnit}>Tiffins</Text>
          </View>
          <Text style={styles.prepNote}>Active subscriptions minus skips</Text>
        </View>
        <View style={styles.prepIcon}>
          <Ionicons name="cafe-outline" size={40} color="#ff9f1c" />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color="#1b4332" />
          <Text style={styles.statNumber}>{prepStats?.total_active || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="pause-circle-outline" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{prepStats?.total_skipping || 0}</Text>
          <Text style={styles.statLabel}>Skipping</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
          <Text style={styles.statNumber}>{prepStats?.total_expired || 0}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      {/* Delivery Manifest */}
      <View style={styles.manifestCard}>
        <View style={styles.manifestHeader}>
          <View style={styles.manifestTitleRow}>
            <Ionicons name="bicycle-outline" size={18} color="#1b4332" />
            <Text style={styles.manifestTitle}>Delivery Manifest</Text>
          </View>
          <View style={styles.sortBadge}>
            <Text style={styles.sortText}>SORTED BY AREA</Text>
          </View>
        </View>

        {subscribers.map((sub) => (
          <View key={sub.id} style={[styles.subscriberRow, sub.skip && styles.subscriberRowSkipped]}>
            <View style={styles.subscriberInfo}>
              <View style={styles.subscriberNameRow}>
                <Text style={styles.subscriberName}>{sub.name}</Text>
                {sub.skip && (
                  <View style={styles.skipBadge}>
                    <Text style={styles.skipBadgeText}>SKIPPING</Text>
                  </View>
                )}
                {sub.status === 'Expired' && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subscriberAddress}>{sub.address}</Text>
            </View>
            {sub.status === 'Active' && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => handleToggleSkip(sub.id)}
                disabled={actionLoading}
              >
                <Ionicons name={sub.skip ? 'play' : 'pause'} size={16} color="#3b82f6" />
              </TouchableOpacity>
            )}
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1b4332' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' },

  prepCard: {
    backgroundColor: '#1b4332',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  prepInfo: { flex: 1 },
  prepLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2 },
  prepNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  prepNumber: { fontSize: 48, fontWeight: '900', color: '#fff' },
  prepUnit: { fontSize: 18, fontWeight: '300', color: '#fff' },
  prepNote: { fontSize: 11, color: '#ff9f1c', marginTop: 8 },
  prepIcon: { backgroundColor: '#2d5a47', padding: 16, borderRadius: 99 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#1b4332', marginTop: 8 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginTop: 2 },

  manifestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  manifestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  manifestTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manifestTitle: { fontSize: 14, fontWeight: '700', color: '#1b4332' },
  sortBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortText: { fontSize: 9, fontWeight: '700', color: '#6b7280' },

  subscriberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subscriberRowSkipped: { backgroundColor: '#f9fafb', opacity: 0.6 },
  subscriberInfo: { flex: 1 },
  subscriberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subscriberName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  subscriberAddress: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  skipBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  skipBadgeText: { fontSize: 8, fontWeight: '700', color: '#dc2626' },
  expiredBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  expiredBadgeText: { fontSize: 8, fontWeight: '700', color: '#6b7280' },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
});
