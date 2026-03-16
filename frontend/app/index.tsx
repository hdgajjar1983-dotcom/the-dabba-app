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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Types
interface UserData {
  id: string;
  name: string;
  credits: number;
  is_skipping_tomorrow: boolean;
  address: string;
  plan_type: string;
}

interface Subscriber {
  id: string;
  name: string;
  address: string;
  status: string;
  skip: boolean;
  plan_type: string;
  credits: number;
}

interface MenuItem {
  id: string;
  day: string;
  main_dish: string;
  accompaniments: string;
  is_special: boolean;
}

interface PrepStats {
  total_active: number;
  total_skipping: number;
  total_prep: number;
  total_expired: number;
}

interface TimeCheck {
  can_modify: boolean;
  current_hour: number;
  cutoff_hour: number;
  message: string;
}

export default function TheDabbaApp() {
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [prepStats, setPrepStats] = useState<PrepStats | null>(null);
  const [timeCheck, setTimeCheck] = useState<TimeCheck | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Check time lock
      const timeRes = await fetch(`${BACKEND_URL}/api/time-check`);
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        setTimeCheck(timeData);
      }

      // Fetch user data
      const userRes = await fetch(`${BACKEND_URL}/api/users/default-user`);
      if (userRes.ok) {
        const userDataRes = await userRes.json();
        setUserData(userDataRes);
      }

      // Fetch subscribers
      const subRes = await fetch(`${BACKEND_URL}/api/subscribers`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscribers(subData);
      }

      // Fetch menu
      const menuRes = await fetch(`${BACKEND_URL}/api/menu`);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(menuData);
      }

      // Fetch prep stats
      const statsRes = await fetch(`${BACKEND_URL}/api/prep-stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setPrepStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Seed data on first load
  const seedData = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/seed`, { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  };

  useEffect(() => {
    seedData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Handle skip toggle for customer
  const handleSkipToggle = async () => {
    if (!userData) return;

    if (!timeCheck?.can_modify) {
      Alert.alert(
        'Time Locked',
        "Cut-off time (10:00 PM) has passed. We've already started preparing your fresh meal!"
      );
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/users/${userData.id}/skip`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_skipping_tomorrow: !userData.is_skipping_tomorrow,
          }),
        }
      );

      if (res.ok) {
        const updatedUser = await res.json();
        setUserData(updatedUser);
      } else {
        const errorData = await res.json();
        Alert.alert('Error', errorData.detail || 'Failed to update skip status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update skip status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle subscriber skip toggle for admin
  const handleSubscriberSkipToggle = async (subId: string) => {
    if (!timeCheck?.can_modify) {
      Alert.alert('Time Locked', 'Cut-off time (10:00 PM) has passed. Changes locked.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/subscribers/${subId}/skip`,
        { method: 'PATCH' }
      );

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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9f1c" />
        <Text style={styles.loadingText}>Loading The Dabba...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandName}>THE DABBA</Text>
          <Text style={styles.tagline}>Halifax's Premium Tiffin Service</Text>
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              view === 'customer' && styles.toggleButtonActive,
            ]}
            onPress={() => setView('customer')}
          >
            <Text
              style={[
                styles.toggleText,
                view === 'customer' && styles.toggleTextActive,
              ]}
            >
              USER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              view === 'admin' && styles.toggleButtonActive,
            ]}
            onPress={() => setView('admin')}
          >
            <Text
              style={[
                styles.toggleText,
                view === 'admin' && styles.toggleTextActive,
              ]}
            >
              OWNER
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {view === 'customer' ? (
          // Customer View
          <View style={styles.customerView}>
            {/* Credit Display Card */}
            <View style={styles.creditCard}>
              <View style={styles.creditCardBg}>
                <Ionicons name="restaurant-outline" size={80} color="#1b4332" />
              </View>
              <Text style={styles.creditLabel}>Available Balance</Text>
              <View style={styles.creditRow}>
                <Text style={styles.creditNumber}>{userData?.credits || 0}</Text>
                <Text style={styles.creditUnit}>Meals</Text>
              </View>

              {/* Tomorrow's Delivery Status */}
              <View style={styles.deliveryStatus}>
                <View>
                  <Text style={styles.deliveryLabel}>Tomorrow's Delivery</Text>
                  <Text
                    style={[
                      styles.deliveryValue,
                      userData?.is_skipping_tomorrow
                        ? styles.statusPaused
                        : styles.statusActive,
                    ]}
                  >
                    {userData?.is_skipping_tomorrow ? 'PAUSED / SKIPPED' : 'ON THE WAY'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.skipButton,
                    userData?.is_skipping_tomorrow
                      ? styles.resumeButton
                      : styles.pauseButton,
                  ]}
                  onPress={handleSkipToggle}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.skipButtonText,
                        userData?.is_skipping_tomorrow && styles.resumeButtonText,
                      ]}
                    >
                      {userData?.is_skipping_tomorrow ? 'RESUME' : 'SKIP TOMORROW'}
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
                <Ionicons name="person-outline" size={20} color="#1b4332" />
                <Text style={styles.userInfoText}>{userData?.name}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Ionicons name="location-outline" size={20} color="#1b4332" />
                <Text style={styles.userInfoText}>{userData?.address}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Ionicons name="leaf-outline" size={20} color="#1b4332" />
                <Text style={styles.userInfoText}>{userData?.plan_type}</Text>
              </View>
            </View>

            {/* Weekly Menu Preview */}
            <Text style={styles.sectionTitle}>This Week's Menu</Text>
            <View style={styles.menuGrid}>
              {menuItems.slice(0, 4).map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.menuCard,
                    item.is_special && styles.menuCardSpecial,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuDay,
                      item.is_special && styles.menuDaySpecial,
                    ]}
                  >
                    {item.is_special ? `${item.day.toUpperCase()} SPECIAL` : item.day.toUpperCase()}
                  </Text>
                  <Text style={styles.menuDish}>{item.main_dish}</Text>
                  <Text style={styles.menuSide}>+ {item.accompaniments}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          // Admin/Owner View
          <View style={styles.adminView}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>Kitchen Command</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Live</Text>
              </View>
            </View>

            {/* Prep Calculator */}
            <View style={styles.prepCard}>
              <View style={styles.prepInfo}>
                <Text style={styles.prepLabel}>Tomorrow's Total Prep</Text>
                <View style={styles.prepNumberRow}>
                  <Text style={styles.prepNumber}>{prepStats?.total_prep || 0}</Text>
                  <Text style={styles.prepUnit}>Tiffins</Text>
                </View>
                <Text style={styles.prepNote}>
                  Calculated based on active subscriptions minus skips.
                </Text>
              </View>
              <View style={styles.prepIcon}>
                <Ionicons name="cafe-outline" size={40} color="#ff9f1c" />
              </View>
            </View>

            {/* Stats Row */}
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
                <View
                  key={sub.id}
                  style={[
                    styles.subscriberRow,
                    sub.skip && styles.subscriberRowSkipped,
                  ]}
                >
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
                      style={styles.mapButton}
                      onPress={() => handleSubscriberSkipToggle(sub.id)}
                      disabled={actionLoading}
                    >
                      <Ionicons
                        name={sub.skip ? 'play' : 'pause'}
                        size={16}
                        color="#3b82f6"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>POWERED BY THE DABBA CORE v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1b4332',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: '#1b4332',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#ff9f1c',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ff9f1c',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d2119',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#ff9f1c',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },

  // Customer View
  customerView: {
    gap: 16,
  },
  creditCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  creditCardBg: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.08,
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  creditNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#1b4332',
  },
  creditUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9ca3af',
  },
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
  deliveryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  deliveryValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statusActive: {
    color: '#16a34a',
  },
  statusPaused: {
    color: '#ef4444',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  resumeButton: {
    backgroundColor: '#16a34a',
  },
  skipButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  resumeButtonText: {
    color: '#fff',
  },
  timeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  timeWarningText: {
    fontSize: 10,
    color: '#ef4444',
  },

  // User Info Card
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // Menu Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b4332',
    marginTop: 8,
    marginBottom: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '48%',
  },
  menuCardSpecial: {
    backgroundColor: '#fff9f0',
    borderColor: '#fed7aa',
  },
  menuDay: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 4,
  },
  menuDaySpecial: {
    color: '#ea580c',
  },
  menuDish: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  menuSide: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  // Admin View
  adminView: {
    gap: 16,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1b4332',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
  },

  // Prep Card
  prepCard: {
    backgroundColor: '#1b4332',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  prepInfo: {
    flex: 1,
  },
  prepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  prepNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  prepNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  prepUnit: {
    fontSize: 18,
    fontWeight: '300',
    color: '#fff',
  },
  prepNote: {
    fontSize: 11,
    color: '#ff9f1c',
    marginTop: 8,
  },
  prepIcon: {
    backgroundColor: '#2d5a47',
    padding: 16,
    borderRadius: 99,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1b4332',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Manifest
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
  manifestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manifestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b4332',
  },
  sortBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6b7280',
  },
  subscriberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subscriberRowSkipped: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  subscriberInfo: {
    flex: 1,
  },
  subscriberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  subscriberAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  skipBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skipBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#dc2626',
  },
  expiredBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiredBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#6b7280',
  },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  // Footer
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d1d5db',
    letterSpacing: 3,
  },
});
