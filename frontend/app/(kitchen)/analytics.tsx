import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { kitchenAPI } from '../../src/services/api';
import { Skeleton, EmptyState } from '../../src/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  warning: '#E65100',
  error: '#C41E3A',
  info: '#1565C0',
};

interface AnalyticsData {
  period_days: number;
  summary: {
    total_customers: number;
    active_subscriptions: number;
    total_deliveries: number;
    delivered: number;
    failed: number;
    skipped: number;
    delivery_rate: number;
  };
  ratings: {
    total: number;
    yummy: number;
    good: number;
    bad: number;
    satisfaction: number;
  };
  daily_chart: Array<{
    date: string;
    delivered: number;
    failed: number;
    total: number;
    success_rate: number;
  }>;
  popular_dishes: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  revenue: {
    estimated: number;
    currency: string;
  };
}

// Stat Card
const StatCard = ({ 
  icon, 
  value, 
  label, 
  bgColor, 
  iconColor, 
  index,
  trend
}: { 
  icon: string; 
  value: number | string; 
  label: string; 
  bgColor: string; 
  iconColor: string; 
  index: number;
  trend?: string;
}) => (
  <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()} style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
      <Ionicons name={icon as any} size={22} color={iconColor} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    {trend && (
      <View style={[styles.trendBadge, { backgroundColor: trend.startsWith('+') ? '#E8F5E9' : '#FFEBEE' }]}>
        <Text style={[styles.trendText, { color: trend.startsWith('+') ? COLORS.success : COLORS.error }]}>
          {trend}
        </Text>
      </View>
    )}
  </Animated.View>
);

// Mini Chart (Simple Bar)
const MiniChart = ({ data }: { data: AnalyticsData['daily_chart'] }) => {
  const maxValue = Math.max(...data.map(d => d.total), 1);
  
  return (
    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.chartCard}>
      <Text style={styles.sectionTitle}>Delivery Trend</Text>
      <View style={styles.chartContainer}>
        {data.map((day, index) => {
          const height = (day.total / maxValue) * 100;
          const successHeight = (day.delivered / maxValue) * 100;
          
          return (
            <View key={day.date} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View style={[styles.barTotal, { height: `${height}%` }]} />
                <View style={[styles.barSuccess, { height: `${successHeight}%` }]} />
              </View>
              <Text style={styles.barLabel}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>Delivered</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.border }]} />
          <Text style={styles.legendText}>Total</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Popular Dishes
const PopularDishes = ({ dishes }: { dishes: AnalyticsData['popular_dishes'] }) => (
  <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Popular Dishes</Text>
    {dishes.map((dish, index) => (
      <View key={dish.id} style={styles.dishRow}>
        <View style={styles.dishRank}>
          <Text style={styles.dishRankText}>{index + 1}</Text>
        </View>
        <Text style={styles.dishName}>{dish.name}</Text>
        <View style={styles.dishCountBadge}>
          <Text style={styles.dishCount}>{dish.count}x</Text>
        </View>
      </View>
    ))}
    {dishes.length === 0 && (
      <Text style={styles.emptyText}>No dish data available</Text>
    )}
  </Animated.View>
);

// Satisfaction Ring
const SatisfactionRing = ({ score }: { score: number }) => {
  const getColor = () => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.info;
    if (score >= 40) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.satisfactionCard}>
      <View style={styles.ringContainer}>
        <View style={[styles.ringOuter, { borderColor: getColor() }]}>
          <Text style={[styles.ringScore, { color: getColor() }]}>{score}%</Text>
        </View>
      </View>
      <View style={styles.satisfactionText}>
        <Text style={styles.satisfactionLabel}>Customer Satisfaction</Text>
        <Text style={styles.satisfactionDesc}>Based on meal ratings</Text>
      </View>
    </Animated.View>
  );
};

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(7);

  const fetchData = useCallback(async () => {
    try {
      const response = await kitchenAPI.getAnalytics(period);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
          </TouchableOpacity>
          <Text style={styles.title}>Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={180} borderRadius={16} />
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
        <Animated.View entering={FadeIn} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
          </TouchableOpacity>
          <Text style={styles.title}>Analytics</Text>
        </Animated.View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[7, 14, 30].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.periodButton, period === days && styles.periodButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPeriod(days);
              }}
            >
              <Text style={[styles.periodText, period === days && styles.periodTextActive]}>
                {days} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {data ? (
          <>
            {/* Key Stats */}
            <View style={styles.statsGrid}>
              <StatCard
                icon="bicycle"
                value={data.summary.delivered}
                label="Delivered"
                bgColor="#E8F5E9"
                iconColor={COLORS.success}
                index={0}
              />
              <StatCard
                icon="people"
                value={data.summary.active_subscriptions}
                label="Active Subs"
                bgColor="#E3F2FD"
                iconColor={COLORS.info}
                index={1}
              />
              <StatCard
                icon="close-circle"
                value={data.summary.skipped}
                label="Skipped"
                bgColor="#FFF3E0"
                iconColor={COLORS.warning}
                index={2}
              />
              <StatCard
                icon="cash"
                value={`$${data.revenue.estimated}`}
                label="Est. Revenue"
                bgColor="#F3E5F5"
                iconColor="#7B1FA2"
                index={3}
              />
            </View>

            {/* Delivery Rate */}
            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.rateCard}>
              <View style={styles.rateContent}>
                <Text style={styles.rateValue}>{data.summary.delivery_rate}%</Text>
                <Text style={styles.rateLabel}>Delivery Success Rate</Text>
              </View>
              <View style={styles.rateBar}>
                <View style={[styles.rateBarFill, { width: `${data.summary.delivery_rate}%` }]} />
              </View>
            </Animated.View>

            {/* Satisfaction */}
            <SatisfactionRing score={data.ratings.satisfaction} />

            {/* Chart */}
            {data.daily_chart.length > 0 && <MiniChart data={data.daily_chart} />}

            {/* Popular Dishes */}
            <PopularDishes dishes={data.popular_dishes} />
          </>
        ) : (
          <EmptyState
            illustration="error"
            title="Unable to load analytics"
            message="Please try refreshing the page."
            actionLabel="Refresh"
            onAction={onRefresh}
          />
        )}
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.cream,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: COLORS.card,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  periodTextActive: {
    color: COLORS.maroon,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statContent: {},
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  trendBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Rate Card
  rateCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateContent: {
    marginBottom: 12,
  },
  rateValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.success,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  rateLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  rateBar: {
    height: 8,
    backgroundColor: COLORS.cream,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  // Satisfaction
  satisfactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ringContainer: {
    marginRight: 16,
  },
  ringOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
  ringScore: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  satisfactionText: {
    flex: 1,
  },
  satisfactionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  satisfactionDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Chart
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 100,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: 20,
    height: 80,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barTotal: {
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  barSuccess: {
    width: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  // Popular Dishes
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dishRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dishRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  dishName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dishCountBadge: {
    backgroundColor: COLORS.goldLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dishCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.maroon,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
