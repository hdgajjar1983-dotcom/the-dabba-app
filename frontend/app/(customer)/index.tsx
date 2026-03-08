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
import { menuAPI, subscriptionAPI, customerAPI } from '../../src/services/api';
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
  const [todayMenu, setTodayMenu] = useState<DayMenu | null>(null);
  const [tomorrowMenu, setTomorrowMenu] = useState<DayMenu | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');

  const fetchData = useCallback(async () => {
    try {
      const [menuRes, subRes, deliveryRes] = await Promise.all([
        menuAPI.getWeeklyMenu(),
        subscriptionAPI.getSubscription().catch(() => null),
        customerAPI.getDeliveryStatus().catch(() => null),
      ]);

      const weeklyMenu = menuRes.data.menu || [];

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const todayItem = weeklyMenu.find((item: DayMenu) => item.date === today);
      const tomorrowItem = weeklyMenu.find((item: DayMenu) => item.date === tomorrow);
      
      setTodayMenu(todayItem || weeklyMenu[0] || null);
      setTomorrowMenu(tomorrowItem || weeklyMenu[1] || null);

      if (subRes?.data) {
        setSubscription(subRes.data);
      }
      
      if (deliveryRes?.data) {
        setDeliveryStatus(deliveryRes.data);
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

  const handleSkipMeal = async (mealType: 'lunch' | 'dinner', menuItem: DayMenu | null, isTomorrow: boolean = false) => {
    if (!menuItem) return;

    // Check if skipping is allowed (24 hours before 4 PM delivery)
    const deliveryDate = new Date(menuItem.date);
    deliveryDate.setHours(16, 0, 0, 0); // 4 PM delivery
    const cutoffTime = new Date(deliveryDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    
    if (new Date() > cutoffTime) {
      Alert.alert('Skip Locked', 'Meals can only be skipped at least 24 hours before the 4 PM delivery time.');
      return;
    }

    Alert.alert(
      'Skip Meal',
      `Skip ${isTomorrow ? "tomorrow's" : "today's"} meal and receive $12 CAD credit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              await subscriptionAPI.skipMeal({
                date: menuItem.date,
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

  const isSkipped = (mealType: string, menuItem: DayMenu | null) => {
    if (!subscription || !menuItem) return false;
    return subscription.skipped_meals?.some(
      (s) => s.date === menuItem.date && s.meal_type === mealType
    );
  };

  const canSkip = (menuItem: DayMenu | null) => {
    if (!menuItem) return false;
    const deliveryDate = new Date(menuItem.date);
    deliveryDate.setHours(16, 0, 0, 0); // 4 PM delivery
    const cutoffTime = new Date(deliveryDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
    return new Date() < cutoffTime;
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

        {/* Delivery Tracking Card */}
        {subscription && (
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryHeader}>
              <View style={styles.deliveryIconPulse}>
                <Ionicons 
                  name={deliveryStatus?.status === 'out_for_delivery' ? 'bicycle' : 
                        deliveryStatus?.status === 'delivered' ? 'checkmark-circle' :
                        deliveryStatus?.status === 'preparing' ? 'restaurant' : 'time'} 
                  size={24} 
                  color={COLORS.card} 
                />
              </View>
              <View style={styles.deliveryHeaderText}>
                <Text style={styles.deliveryTitle}>
                  {deliveryStatus?.status === 'out_for_delivery' ? 'Your Dabba is on the way!' : 
                   deliveryStatus?.status === 'delivered' ? 'Delivered!' :
                   deliveryStatus?.status === 'preparing' ? 'Being Prepared' : 
                   deliveryStatus?.status === 'skipped' ? 'Meal Skipped' : 'Scheduled for Today'}
                </Text>
                <Text style={styles.deliverySubtitle}>
                  {deliveryStatus?.status === 'skipped' ? 'Credit added to wallet' :
                   deliveryStatus?.estimated_time || 'Delivery at 4:00 PM'}
                </Text>
              </View>
            </View>
            
            {/* Progress Steps */}
            {deliveryStatus?.status !== 'skipped' && (
              <View style={styles.progressContainer}>
                <View style={styles.progressStep}>
                  <View style={[styles.progressDot, styles.progressDotComplete]} />
                  <Text style={styles.progressLabel}>Ordered</Text>
                </View>
                <View style={[styles.progressLine, styles.progressLineComplete]} />
                <View style={styles.progressStep}>
                  <View style={[styles.progressDot, (deliveryStatus?.status && deliveryStatus.status !== 'pending') && styles.progressDotComplete]} />
                  <Text style={styles.progressLabel}>Preparing</Text>
                </View>
                <View style={[styles.progressLine, (deliveryStatus?.status === 'out_for_delivery' || deliveryStatus?.status === 'delivered') && styles.progressLineComplete]} />
                <View style={styles.progressStep}>
                  <View style={[styles.progressDot, (deliveryStatus?.status === 'out_for_delivery' || deliveryStatus?.status === 'delivered') && styles.progressDotActive]} />
                  <Text style={styles.progressLabel}>On Way</Text>
                </View>
                <View style={[styles.progressLine, deliveryStatus?.status === 'delivered' && styles.progressLineComplete]} />
                <View style={styles.progressStep}>
                  <View style={[styles.progressDot, deliveryStatus?.status === 'delivered' && styles.progressDotComplete]} />
                  <Text style={styles.progressLabel}>Delivered</Text>
                </View>
              </View>
            )}
            
            {/* Driver Info */}
            {deliveryStatus?.driver && (
              <View style={styles.driverInfo}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{deliveryStatus.driver.name?.charAt(0) || 'D'}</Text>
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{deliveryStatus.driver.name || 'Driver'}</Text>
                  <Text style={styles.driverPhone}>{deliveryStatus.driver.phone || ''}</Text>
                </View>
                <TouchableOpacity style={styles.callDriverBtn}>
                  <Ionicons name="call" size={20} color={COLORS.card} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Meal Menu Section with Today/Tomorrow Tabs */}
        <View style={styles.section}>
          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'today' && styles.tabActive]}
              onPress={() => setActiveTab('today')}
            >
              <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tomorrow' && styles.tabActive]}
              onPress={() => setActiveTab('tomorrow')}
            >
              <Text style={[styles.tabText, activeTab === 'tomorrow' && styles.tabTextActive]}>Tomorrow</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {activeTab === 'today' ? "Today's Meal" : "Tomorrow's Meal"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {activeTab === 'today' 
                  ? (todayMenu ? todayMenu.day : '') 
                  : (tomorrowMenu ? tomorrowMenu.day : '')}
              </Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {activeTab === 'today'
                  ? (todayMenu ? new Date(todayMenu.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')
                  : (tomorrowMenu ? new Date(tomorrowMenu.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')}
              </Text>
            </View>
          </View>

          {/* Meal Card */}
          {(activeTab === 'today' ? todayMenu : tomorrowMenu) ? (
            <View style={[
              styles.mealCard, 
              isSkipped('dinner', activeTab === 'today' ? todayMenu : tomorrowMenu) && styles.mealCardSkipped
            ]}>
              {/* Meal Header */}
              <View style={styles.mealHeader}>
                <View style={styles.mealIconContainer}>
                  <Ionicons name={activeTab === 'today' ? "sunny" : "moon"} size={24} color={COLORS.card} />
                </View>
                <View style={styles.mealHeaderText}>
                  <Text style={styles.mealType}>
                    {activeTab === 'today' ? "Today's Meal" : "Tomorrow's Meal"}
                  </Text>
                  <Text style={styles.mealTypeSub}>Delivery at 4:00 PM</Text>
                </View>
                {isSkipped('dinner', activeTab === 'today' ? todayMenu : tomorrowMenu) ? (
                  <View style={styles.skippedBadge}>
                    <Text style={styles.skippedText}>Skipped</Text>
                  </View>
                ) : (
                  subscription && canSkip(activeTab === 'today' ? todayMenu : tomorrowMenu) ? (
                    <TouchableOpacity 
                      style={styles.skipButton} 
                      onPress={() => handleSkipMeal('dinner', activeTab === 'today' ? todayMenu : tomorrowMenu, activeTab === 'tomorrow')}
                    >
                      <Text style={styles.skipButtonText}>Skip</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={14} color={COLORS.textLight} />
                      <Text style={styles.lockedText}>Locked</Text>
                    </View>
                  )
                )}
              </View>

              {/* Meal Content */}
              <View style={styles.mealContent}>
                <Text style={styles.mealName}>
                  {(activeTab === 'today' ? todayMenu?.dinner?.name : tomorrowMenu?.dinner?.name) || 'Meal TBD'}
                </Text>
                <Text style={styles.mealDescription}>
                  {(activeTab === 'today' ? todayMenu?.dinner?.description : tomorrowMenu?.dinner?.description) || 'Menu will be announced soon'}
                </Text>
                
                <View style={styles.mealFooter}>
                  <View style={styles.mealTypeBadge}>
                    <Ionicons name="leaf" size={14} color={COLORS.success} />
                    <Text style={styles.mealTypeBadgeText}>
                      {(activeTab === 'today' ? todayMenu?.dinner?.type : tomorrowMenu?.dinner?.type) || 'Vegetarian'}
                    </Text>
                  </View>
                  <View style={styles.deliveryInfo}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.deliveryText}>4:00 PM Delivery</Text>
                  </View>
                </View>
              </View>

              {/* Skip Info */}
              {!isSkipped('dinner', activeTab === 'today' ? todayMenu : tomorrowMenu) && !canSkip(activeTab === 'today' ? todayMenu : tomorrowMenu) && (
                <View style={styles.skipInfoBar}>
                  <Ionicons name="information-circle" size={16} color={COLORS.textLight} />
                  <Text style={styles.skipInfoText}>Skip cutoff: 24 hrs before 4 PM delivery</Text>
                </View>
              )}

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
              <Text style={styles.emptyStateText}>
                No menu available for {activeTab === 'today' ? 'today' : 'tomorrow'}
              </Text>
            </View>
          )}
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
  // Delivery Tracking Card Styles
  deliveryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    padding: 16,
  },
  deliveryIconPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryHeaderText: {
    flex: 1,
    marginLeft: 14,
  },
  deliveryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  deliverySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cream,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },
  progressDotComplete: {
    backgroundColor: COLORS.success,
  },
  progressDotActive: {
    backgroundColor: COLORS.maroon,
  },
  progressLine: {
    height: 3,
    width: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
    marginBottom: 18,
    borderRadius: 2,
  },
  progressLineComplete: {
    backgroundColor: COLORS.success,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  driverPhone: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  callDriverBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.maroon,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.goldLight,
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
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  skipInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.cream,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipInfoText: {
    fontSize: 12,
    color: COLORS.textLight,
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
