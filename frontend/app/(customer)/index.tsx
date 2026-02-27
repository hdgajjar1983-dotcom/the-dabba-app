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
import { useAuth } from '../../src/context/AuthContext';
import { menuAPI, subscriptionAPI } from '../../src/services/api';

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

      // Find today's menu
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

    Alert.alert(
      'Skip Meal',
      `Skip ${mealType} and receive ₹120 credit?`,
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
              Alert.alert('Success', '₹120 has been credited to your wallet!');
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
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}!</Text>
            <Text style={styles.subGreeting}>Ready for today's delicious meals?</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </View>
        </View>

        {/* Subscription Status */}
        {subscription ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.planBadge}>
                <Ionicons name="star" size={16} color={COLORS.primary} />
                <Text style={styles.planText}>{subscription.plan} Plan</Text>
              </View>
              <View style={[styles.statusBadge, subscription.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{subscription.status}</Text>
              </View>
            </View>
            <View style={styles.subscriptionDetails}>
              <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.addressText} numberOfLines={1}>{subscription.delivery_address}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.noSubscriptionCard}>
            <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />
            <Text style={styles.noSubscriptionText}>Subscribe to start receiving meals</Text>
          </TouchableOpacity>
        )}

        {/* Today's Menu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Menu</Text>
            <Text style={styles.dateText}>
              {todayMenu ? `${todayMenu.day}, ${new Date(todayMenu.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
            </Text>
          </View>

          {todayMenu ? (
            <>
              {/* Lunch Card */}
              <View style={[styles.mealCard, isSkipped('lunch') && styles.mealCardSkipped]}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealTypeContainer}>
                    <Ionicons name="sunny" size={20} color={COLORS.warning} />
                    <Text style={styles.mealType}>Lunch</Text>
                  </View>
                  {isSkipped('lunch') ? (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedText}>Skipped</Text>
                    </View>
                  ) : (
                    subscription && (
                      <TouchableOpacity style={styles.skipButton} onPress={() => handleSkipMeal('lunch')}>
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.textLight} />
                        <Text style={styles.skipButtonText}>Skip (+₹120)</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
                <Text style={styles.mealName}>{todayMenu.lunch.name}</Text>
                <Text style={styles.mealDescription}>{todayMenu.lunch.description}</Text>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeBadgeText}>{todayMenu.lunch.type}</Text>
                </View>
              </View>

              {/* Dinner Card */}
              <View style={[styles.mealCard, isSkipped('dinner') && styles.mealCardSkipped]}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealTypeContainer}>
                    <Ionicons name="moon" size={20} color={COLORS.primary} />
                    <Text style={styles.mealType}>Dinner</Text>
                  </View>
                  {isSkipped('dinner') ? (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedText}>Skipped</Text>
                    </View>
                  ) : (
                    subscription && (
                      <TouchableOpacity style={styles.skipButton} onPress={() => handleSkipMeal('dinner')}>
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.textLight} />
                        <Text style={styles.skipButtonText}>Skip (+₹120)</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
                <Text style={styles.mealName}>{todayMenu.dinner.name}</Text>
                <Text style={styles.mealDescription}>{todayMenu.dinner.description}</Text>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeBadgeText}>{todayMenu.dinner.type}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>No menu available for today</Text>
            </View>
          )}
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subscriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  subscriptionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  noSubscriptionCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  noSubscriptionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  mealCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealCardSkipped: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  skipButtonText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  skippedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skippedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  mealName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  mealDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  mealTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
});
