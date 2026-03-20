import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/context/AuthContext';
import { kitchenAPI } from '../../src/services/api';
import DabbaLogo, { BRAND_COLORS } from '../../src/components/DabbaLogo';
import { AnimatedCard, AnimatedCounter, PulsingDot, Skeleton } from '../../src/components/AnimatedComponents';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
  warning: '#E65100',
  info: '#1565C0',
};

interface DashboardStats {
  total_customers: number;
  active_subscriptions: number;
  total_dishes: number;
  deliveries_today: number;
  completed_today: number;
  pending_today: number;
}

// Animated stat card
const StatCard = ({ icon, value, label, bgColor, iconColor, index }: any) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        entering={FadeInDown.delay(200 + index * 100).springify()}
        style={[styles.statCard, { backgroundColor: bgColor }, animatedStyle]}
      >
        <Ionicons name={icon} size={32} color={iconColor} />
        <AnimatedCounter value={value} style={styles.statValue} />
        <Text style={styles.statLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Quick action card - redesigned as horizontal pill
const ActionCard = ({ icon, label, bgColor, iconColor, onPress, index }: any) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        entering={FadeInDown.delay(500 + index * 60).springify()}
        style={[styles.actionCard, animatedStyle]}
      >
        <View style={[styles.actionIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <Text style={styles.actionText}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function KitchenDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await kitchenAPI.getDashboard();
      setStats(response.data);
    } catch (error: any) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(500)}>
            <DabbaLogo size={100} />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.loadingContent}>
            <View style={styles.skeletonGrid}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width="48%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
              ))}
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const statsData = [
    { icon: 'people', value: stats?.total_customers || 0, label: 'Total Customers', bgColor: '#E8F5E9', iconColor: COLORS.success },
    { icon: 'card', value: stats?.active_subscriptions || 0, label: 'Active Plans', bgColor: '#FFF3E0', iconColor: COLORS.warning },
    { icon: 'restaurant', value: stats?.total_dishes || 0, label: 'Items', bgColor: '#E3F2FD', iconColor: COLORS.info },
    { icon: 'bicycle', value: stats?.deliveries_today || 0, label: "Today&apos;s Orders", bgColor: '#FCE4EC', iconColor: COLORS.maroon },
  ];

  const actionsData = [
    { icon: 'add-circle', label: 'Add Item', bgColor: '#E8F5E9', iconColor: COLORS.success, route: '/(kitchen)/dishes' },
    { icon: 'calendar', label: 'Set Dabba', bgColor: '#FFF3E0', iconColor: COLORS.warning, route: '/(kitchen)/menu' },
    { icon: 'star', label: 'Feedback', bgColor: '#FCE4EC', iconColor: COLORS.maroon, route: '/(kitchen)/feedback' },
    { icon: 'stats-chart', label: 'Analytics', bgColor: '#E3F2FD', iconColor: COLORS.info, route: '/(kitchen)/analytics' },
    { icon: 'receipt', label: 'Orders', bgColor: '#E0F7FA', iconColor: '#00838F', route: '/(kitchen)/orders' },
    { icon: 'people', label: 'Customers', bgColor: '#F3E5F5', iconColor: '#7B1FA2', route: '/(kitchen)/customers' },
  ];

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <DabbaLogo size={48} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.title}>Kitchen Portal</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.maroon} />
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Card - Today's Overview */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.heroCard}>
          <View style={styles.heroGradient}>
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>Today&apos;s Orders</Text>
                <View style={styles.heroValueRow}>
                  <AnimatedCounter value={stats?.deliveries_today || 0} style={styles.heroValue} />
                  <View style={styles.heroBadge}>
                    <PulsingDot color="#FFF" size={8} isActive={(stats?.pending_today || 0) > 0} />
                    <Text style={styles.heroBadgeText}>{stats?.pending_today || 0} pending</Text>
                  </View>
                </View>
              </View>
              <View style={styles.heroRight}>
                <View style={styles.heroIconContainer}>
                  <Ionicons name="restaurant" size={32} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.heroProgress}>
              <View style={styles.heroProgressBg}>
                <Animated.View 
                  entering={FadeIn.delay(600)}
                  style={[
                    styles.heroProgressFill, 
                    { 
                      width: `${stats?.deliveries_today ? ((stats?.completed_today || 0) / stats.deliveries_today) * 100 : 0}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.heroProgressText}>
                {stats?.completed_today || 0} delivered • {stats?.deliveries_today ? Math.round(((stats?.completed_today || 0) / stats.deliveries_today) * 100) : 0}% complete
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {statsData.slice(0, 3).map((stat, index) => (
            <Animated.View 
              key={stat.label} 
              entering={FadeInDown.delay(200 + index * 80).springify()}
              style={styles.miniStatCard}
            >
              <View style={[styles.miniStatIcon, { backgroundColor: stat.bgColor }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.iconColor} />
              </View>
              <AnimatedCounter value={stat.value} style={styles.miniStatValue} />
              <Text style={styles.miniStatLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Quick Actions Section */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>Manage your kitchen</Text>
        </Animated.View>
        
        <View style={styles.actionsRow}>
          {actionsData.map((action, index) => (
            <ActionCard
              key={action.label}
              {...action}
              index={index}
              onPress={() => router.push(action.route as any)}
            />
          ))}
        </View>

        {/* Prep List CTA */}
        <AnimatedCard index={8} style={styles.prepListCard} onPress={() => router.push('/(kitchen)/preparation' as any)}>
          <View style={styles.prepListContent}>
            <View style={styles.prepListLeft}>
              <View style={styles.prepListIconContainer}>
                <Ionicons name="clipboard" size={26} color="#FFF" />
              </View>
              <View style={styles.prepListText}>
                <Text style={styles.prepListTitle}>Preparation List</Text>
                <Text style={styles.prepListSubtitle}>What to cook today</Text>
              </View>
            </View>
            <View style={styles.prepListArrow}>
              <Ionicons name="arrow-forward" size={20} color={COLORS.goldLight} />
            </View>
          </View>
        </AnimatedCard>

        {/* Customers Card */}
        <AnimatedCard index={9} style={styles.customersCard} onPress={() => router.push('/(kitchen)/customers' as any)}>
          <View style={styles.customersContent}>
            <View style={styles.customersLeft}>
              <View style={styles.customersIconContainer}>
                <Ionicons name="people" size={24} color={COLORS.success} />
              </View>
              <View>
                <Text style={styles.customersTitle}>Customers</Text>
                <Text style={styles.customersCount}>{stats?.total_customers || 0} total</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.textLight} />
          </View>
        </AnimatedCard>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(700)} style={styles.footer}>
          <View style={styles.footerDivider}>
            <View style={styles.footerLine} />
            <Ionicons name="restaurant" size={16} color={COLORS.gold} />
            <View style={styles.footerLine} />
          </View>
          <Text style={styles.footerText}>The Dabba Kitchen</Text>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContent: {
    width: '100%',
    marginTop: 20,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // Header
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
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gold,
    marginTop: 2,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  // Hero Card
  heroCard: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroGradient: {
    backgroundColor: COLORS.maroon,
    padding: 20,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  heroRight: {
    justifyContent: 'center',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProgress: {
    marginTop: 20,
  },
  heroProgressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: COLORS.goldLight,
    borderRadius: 3,
  },
  heroProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '500',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  miniStatLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  // Section Header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Actions - redesigned as vertical list
  actionsRow: {
    marginBottom: 16,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Prep List Card
  prepListCard: {
    backgroundColor: COLORS.maroon,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  prepListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  prepListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prepListIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepListText: {
    marginLeft: 14,
    flex: 1,
  },
  prepListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  prepListSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  prepListArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Customers Card
  customersCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  customersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  customersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customersIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customersTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  customersCount: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 1,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 8,
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.4,
    marginHorizontal: 10,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  // Legacy styles kept for backward compatibility
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  progressBarContainer: {
    marginTop: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'right',
  },
  prepListIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
