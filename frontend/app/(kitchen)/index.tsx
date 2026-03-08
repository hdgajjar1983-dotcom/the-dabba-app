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

// Quick action card
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
        entering={FadeInDown.delay(500 + index * 80).springify()}
        style={[styles.actionCard, animatedStyle]}
      >
        <View style={[styles.actionIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={28} color={iconColor} />
        </View>
        <Text style={styles.actionText}>{label}</Text>
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
    { icon: 'restaurant', value: stats?.total_dishes || 0, label: 'Dishes', bgColor: '#E3F2FD', iconColor: COLORS.info },
    { icon: 'bicycle', value: stats?.deliveries_today || 0, label: "Today&apos;s Orders", bgColor: '#FCE4EC', iconColor: COLORS.maroon },
  ];

  const actionsData = [
    { icon: 'add-circle', label: 'Add Dish', bgColor: '#E8F5E9', iconColor: COLORS.success, route: '/(kitchen)/dishes' },
    { icon: 'calendar', label: 'Set Menu', bgColor: '#FFF3E0', iconColor: COLORS.warning, route: '/(kitchen)/menu' },
    { icon: 'receipt', label: 'Orders', bgColor: '#FCE4EC', iconColor: COLORS.maroon, route: '/(kitchen)/orders' },
  ];

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
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <DabbaLogo size={50} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Kitchen Portal</Text>
              <Text style={styles.subtitle}>Manage your Dabba</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.maroon} />
          </TouchableOpacity>
        </Animated.View>

        {/* Decorative Divider */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statsData.map((stat, index) => (
            <StatCard key={stat.label} {...stat} index={index} />
          ))}
        </View>

        {/* Today's Summary */}
        <AnimatedCard index={5} style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today&apos;s Delivery Status</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <PulsingDot color={COLORS.success} size={10} isActive={true} />
                <AnimatedCounter value={stats?.completed_today || 0} style={styles.summaryValue} />
              </View>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemHeader}>
                <PulsingDot color={COLORS.warning} size={10} isActive={(stats?.pending_today || 0) > 0} />
                <AnimatedCounter value={stats?.pending_today || 0} style={styles.summaryValue} />
              </View>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
          
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View 
                entering={FadeIn.delay(800)}
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${stats?.deliveries_today ? ((stats?.completed_today || 0) / stats.deliveries_today) * 100 : 0}%` 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {stats?.deliveries_today ? Math.round(((stats?.completed_today || 0) / stats.deliveries_today) * 100) : 0}% Complete
            </Text>
          </View>
        </AnimatedCard>

        {/* Quick Actions */}
        <Animated.Text entering={FadeInDown.delay(450).springify()} style={styles.sectionTitle}>
          Quick Actions
        </Animated.Text>
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

        {/* Prep List Button */}
        <AnimatedCard index={8} style={styles.prepListCard} onPress={() => router.push('/(kitchen)/preparation-list')}>
          <View style={styles.prepListContent}>
            <View style={styles.prepListIcon}>
              <Ionicons name="clipboard" size={28} color={COLORS.card} />
            </View>
            <View style={styles.prepListText}>
              <Text style={styles.prepListTitle}>Today's Preparation List</Text>
              <Text style={styles.prepListSubtitle}>View what needs to be cooked</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.gold} />
          </View>
        </AnimatedCard>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(700)} style={styles.footer}>
          <Text style={styles.footerText}>~ Kitchen Admin Portal ~</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    width: '31%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  prepListCard: {
    backgroundColor: COLORS.maroon,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  prepListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  prepListIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepListText: {
    flex: 1,
    marginLeft: 14,
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
  footer: {
    alignItems: 'center',
    marginTop: 12,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
});
