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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { menuAPI, subscriptionAPI } from '../../src/services/api';
import DabbaLogo, { BRAND_COLORS } from '../../src/components/DabbaLogo';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
  successLight: '#E8F5E9',
};

interface MenuItem {
  name: string;
  description: string;
  type: string;
}

interface DayMenu {
  date: string;
  day: string;
  lunch: MenuItem;
  dinner: MenuItem;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  delivery_address: string;
  skipped_meals: { date: string; meal_type: string }[];
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [menu, setMenu] = useState<DayMenu[]>([]);
  const [todayMenu, setTodayMenu] = useState<DayMenu | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, subRes] = await Promise.all([
        menuAPI.getWeeklyMenu(),
        subscriptionAPI.getSubscription().catch(() => null),
      ]);

      const weeklyMenu = menuRes.data.menu || [];
      setMenu(weeklyMenu);

      const today = new Date().toISOString().split('T')[0];
      const todayItem = weeklyMenu.find((item: DayMenu) => item.date === today);
      setTodayMenu(todayItem || weeklyMenu[0] || null);

      if (subRes?.data) {
        setSubscription(subRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
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

  const handleSkipMeal = async (mealType: 'lunch' | 'dinner') => {
    if (!todayMenu) return;

    // Check if skipping is allowed (24 hours before 4 PM delivery)
    const deliveryDate = new Date(todayMenu.date);
    deliveryDate.setHours(16, 0, 0, 0); // 4 PM delivery
    const cutoffTime = new Date(deliveryDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    
    if (new Date() > cutoffTime) {
      Alert.alert('Cannot Skip', 'Meals can only be skipped at least 24 hours before the 4 PM delivery time.');
      return;
    }

    Alert.alert(
      'Skip Meal',
      `Skip ${mealType} and receive $12 CAD credit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              await subscriptionAPI.skipMeal({
                date: todayMenu.date,
                meal_type: mealType,
              });
              Alert.alert('Success', '$12 CAD has been credited to your wallet!');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to skip meal');
            }
          },
        },
      ]
    );
  };

  const isSkipped = (mealType: string) => {
    if (!subscription || !todayMenu) return false;
    return subscription.skipped_meals?.some(
      (s) => s.date === todayMenu.date && s.meal_type === mealType
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <DabbaLogo size={100} />
          <ActivityIndicator size="large" color={COLORS.maroon} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <DabbaLogo size={50} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Namaste, {user?.name?.split(' ')[0] || 'there'}!</Text>
              <Text style={styles.subGreeting}>Aaj ka swadisht bhojan</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.maroon} />
          </TouchableOpacity>
        </View>

        {/* Decorative Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        {/* Subscription Status */}
        {subscription ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.planBadge}>
                <Ionicons name="star" size={16} color={COLORS.gold} />
                <Text style={styles.planText}>{subscription.plan} Plan</Text>
              </View>
              <View style={[styles.statusBadge, subscription.status === 'active' && styles.statusActive]}>
                <Text style={styles.statusText}>{subscription.status}</Text>
              </View>
            </View>
            <View style={styles.subscriptionDetails}>
              <Ionicons name="location" size={18} color={COLORS.maroon} />
              <Text style={styles.addressText} numberOfLines={1}>{subscription.delivery_address}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.noSubscriptionCard}>
            <View style={styles.noSubIcon}>
              <Ionicons name="add" size={28} color={COLORS.maroon} />
            </View>
            <View style={styles.noSubContent}>
              <Text style={styles.noSubTitle}>Start Your Journey</Text>
              <Text style={styles.noSubText}>Subscribe to receive traditional meals</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.gold} />
          </TouchableOpacity>
        )}

        {/* Today's Menu Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today's Thali</Text>
              <Text style={styles.sectionSubtitle}>
                {todayMenu ? `${todayMenu.day}` : ''}
              </Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {todayMenu ? new Date(todayMenu.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </Text>
            </View>
          </View>

          {todayMenu ? (
            <View style={[styles.mealCard, isSkipped('dinner') && styles.mealCardSkipped]}>
              {/* Meal Header */}
              <View style={styles.mealHeader}>
                <View style={styles.mealIconContainer}>
                  <Ionicons name="moon" size={24} color={COLORS.card} />
                </View>
                <View style={styles.mealHeaderText}>
                  <Text style={styles.mealType}>Tonight's Dinner</Text>
                  <Text style={styles.mealTypeSub}>Fresh & Hot Delivery</Text>
                </View>
                {isSkipped('dinner') ? (
                  <View style={styles.skippedBadge}>
                    <Text style={styles.skippedText}>Skipped</Text>
                  </View>
                ) : (
                  subscription && (
                    <TouchableOpacity style={styles.skipButton} onPress={() => handleSkipMeal('dinner')}>
                      <Text style={styles.skipButtonText}>Skip +₹120</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Meal Content */}
              <View style={styles.mealContent}>
                <Text style={styles.mealName}>{todayMenu.dinner.name}</Text>
                <Text style={styles.mealDescription}>{todayMenu.dinner.description}</Text>
                
                <View style={styles.mealFooter}>
                  <View style={styles.mealTypeBadge}>
                    <Ionicons name="leaf" size={14} color={COLORS.success} />
                    <Text style={styles.mealTypeBadgeText}>{todayMenu.dinner.type}</Text>
                  </View>
                  <View style={styles.deliveryInfo}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.deliveryText}>7:00 - 8:30 PM</Text>
                  </View>
                </View>
              </View>

              {/* Decorative Bottom */}
              <View style={styles.mealDecor}>
                <View style={styles.decorLine} />
                <Ionicons name="restaurant" size={16} color={COLORS.gold} />
                <View style={styles.decorLine} />
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>No menu available for today</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="calendar-outline" size={24} color="#E65100" />
            </View>
            <Text style={styles.actionText}>Weekly Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="wallet-outline" size={24} color="#2E7D32" />
            </View>
            <Text style={styles.actionText}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="help-circle-outline" size={24} color="#1565C0" />
            </View>
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>~ Ghar Ka Swad, Roz ~</Text>
        </View>
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
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subGreeting: {
    fontSize: 13,
    color: COLORS.gold,
    marginTop: 2,
    fontStyle: 'italic',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    height: 1,
    width: 60,
    backgroundColor: COLORS.gold,
    opacity: 0.5,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginHorizontal: 10,
  },
  subscriptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.goldLight,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  statusActive: {
    backgroundColor: COLORS.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  subscriptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  noSubscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
  },
  noSubIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.maroon,
  },
  noSubContent: {
    flex: 1,
    marginLeft: 14,
  },
  noSubTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  noSubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mealCardSkipped: {
    opacity: 0.6,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    padding: 16,
  },
  mealIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  mealTypeSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  skipButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  skippedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skippedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  mealContent: {
    padding: 18,
  },
  mealName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  mealDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 22,
    marginBottom: 16,
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mealTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  mealDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.cream,
  },
  decorLine: {
    height: 1,
    width: 40,
    backgroundColor: COLORS.gold,
    marginHorizontal: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
});
