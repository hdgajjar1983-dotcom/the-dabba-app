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
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { kitchenAPI } from '../../src/services/api';
import { Skeleton, EmptyState } from '../../src/components';

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
};

interface FeedbackData {
  period_days: number;
  total_ratings: number;
  rating_counts: { yummy: number; good: number; bad: number };
  satisfaction_score: number;
  daily_trends: Array<{
    date: string;
    yummy: number;
    good: number;
    bad: number;
    total: number;
    satisfaction: number;
  }>;
  recent_feedback: Array<{
    date: string;
    rating: string;
    feedback: string;
    customer_name: string;
  }>;
  issue_counts: Record<string, number>;
  total_issues: number;
  recent_issues: Array<{
    id: string;
    date: string;
    issue_type: string;
    description: string;
    status: string;
    customer_name: string;
  }>;
}

const ratingConfig = {
  yummy: { emoji: '😋', label: 'Yummy!', color: COLORS.success, bgColor: '#E8F5E9' },
  good: { emoji: '👍', label: 'Good', color: '#1565C0', bgColor: '#E3F2FD' },
  bad: { emoji: '👎', label: 'Not Great', color: COLORS.error, bgColor: '#FFEBEE' },
};

const issueLabels: Record<string, string> = {
  cold_food: 'Cold Food',
  spilled: 'Spilled',
  missing_item: 'Missing Item',
  other: 'Other',
};

// Satisfaction Score Card
const SatisfactionCard = ({ score, totalRatings }: { score: number; totalRatings: number }) => {
  const getScoreColor = () => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return '#1565C0';
    if (score >= 40) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.satisfactionCard}>
      <View style={styles.satisfactionHeader}>
        <Ionicons name="happy-outline" size={28} color={getScoreColor()} />
        <Text style={styles.satisfactionLabel}>Customer Satisfaction</Text>
      </View>
      <Text style={[styles.satisfactionScore, { color: getScoreColor() }]}>{score}%</Text>
      <Text style={styles.totalRatings}>{totalRatings} ratings this month</Text>
    </Animated.View>
  );
};

// Rating Breakdown
const RatingBreakdown = ({ counts }: { counts: { yummy: number; good: number; bad: number } }) => {
  const total = counts.yummy + counts.good + counts.bad;
  
  return (
    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.breakdownCard}>
      <Text style={styles.sectionTitle}>Rating Breakdown</Text>
      {Object.entries(ratingConfig).map(([key, config]) => {
        const count = counts[key as keyof typeof counts] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        return (
          <View key={key} style={styles.ratingRow}>
            <View style={styles.ratingLabel}>
              <Text style={styles.ratingEmoji}>{config.emoji}</Text>
              <Text style={styles.ratingText}>{config.label}</Text>
            </View>
            <View style={styles.ratingBar}>
              <View style={[styles.ratingBarFill, { width: `${percentage}%`, backgroundColor: config.color }]} />
            </View>
            <Text style={styles.ratingCount}>{count}</Text>
          </View>
        );
      })}
    </Animated.View>
  );
};

// Recent Feedback Card
const FeedbackCard = ({ feedback, index }: { feedback: FeedbackData['recent_feedback'][0]; index: number }) => {
  const config = ratingConfig[feedback.rating as keyof typeof ratingConfig] || ratingConfig.good;
  
  return (
    <Animated.View entering={FadeInDown.delay(300 + index * 50).springify()} style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <View style={[styles.feedbackBadge, { backgroundColor: config.bgColor }]}>
          <Text style={styles.feedbackEmoji}>{config.emoji}</Text>
        </View>
        <View style={styles.feedbackMeta}>
          <Text style={styles.feedbackCustomer}>{feedback.customer_name}</Text>
          <Text style={styles.feedbackDate}>
            {new Date(feedback.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
      <Text style={styles.feedbackText}>"{feedback.feedback}"</Text>
    </Animated.View>
  );
};

// Issue Card
const IssueCard = ({ issue, index }: { issue: FeedbackData['recent_issues'][0]; index: number }) => {
  const getStatusColor = () => {
    switch (issue.status) {
      case 'resolved': return COLORS.success;
      case 'pending': return COLORS.warning;
      default: return COLORS.textLight;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(400 + index * 50).springify()} style={styles.issueCard}>
      <View style={styles.issueHeader}>
        <View style={[styles.issueIcon, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
        </View>
        <View style={styles.issueMeta}>
          <Text style={styles.issueType}>{issueLabels[issue.issue_type] || issue.issue_type}</Text>
          <Text style={styles.issueCustomer}>{issue.customer_name}</Text>
        </View>
        <View style={[styles.issueStatus, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.issueStatusText, { color: getStatusColor() }]}>{issue.status}</Text>
        </View>
      </View>
      {issue.description && (
        <Text style={styles.issueDescription} numberOfLines={2}>{issue.description}</Text>
      )}
    </Animated.View>
  );
};

export default function FeedbackDashboardScreen() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);

  const fetchData = useCallback(async () => {
    try {
      const response = await kitchenAPI.getFeedbackDashboard(period);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching feedback dashboard:', error);
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
          <Text style={styles.title}>Feedback Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={140} borderRadius={20} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={120} borderRadius={16} />
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
          <Text style={styles.title}>Feedback Dashboard</Text>
        </Animated.View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[7, 30, 90].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.periodButton, period === days && styles.periodButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPeriod(days);
              }}
            >
              <Text style={[styles.periodText, period === days && styles.periodTextActive]}>
                {days === 7 ? '7 days' : days === 30 ? '30 days' : '90 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {data ? (
          <>
            {/* Satisfaction Score */}
            <SatisfactionCard score={data.satisfaction_score} totalRatings={data.total_ratings} />

            {/* Rating Breakdown */}
            <RatingBreakdown counts={data.rating_counts} />

            {/* Recent Feedback with Comments */}
            {data.recent_feedback.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Comments</Text>
                {data.recent_feedback.slice(0, 5).map((fb, index) => (
                  <FeedbackCard key={index} feedback={fb} index={index} />
                ))}
              </View>
            )}

            {/* Issues Summary */}
            {data.total_issues > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Reported Issues</Text>
                  <View style={styles.issueBadge}>
                    <Text style={styles.issueBadgeText}>{data.total_issues} total</Text>
                  </View>
                </View>
                {data.recent_issues.slice(0, 5).map((issue, index) => (
                  <IssueCard key={issue.id} issue={issue} index={index} />
                ))}
              </View>
            )}

            {/* Empty State for no data */}
            {data.total_ratings === 0 && data.total_issues === 0 && (
              <EmptyState
                illustration="notifications"
                title="No feedback yet"
                message="Customer ratings and feedback will appear here once they start rating their meals."
              />
            )}
          </>
        ) : (
          <EmptyState
            illustration="error"
            title="Unable to load data"
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
  // Satisfaction Card
  satisfactionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  satisfactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  satisfactionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  satisfactionScore: {
    fontSize: 56,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 4,
  },
  totalRatings: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  // Breakdown Card
  breakdownCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: 8,
  },
  ratingEmoji: {
    fontSize: 20,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  ratingBar: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.cream,
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  ratingCount: {
    width: 36,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  issueBadge: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  issueBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  // Feedback Card
  feedbackCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  feedbackEmoji: {
    fontSize: 18,
  },
  feedbackMeta: {
    flex: 1,
  },
  feedbackCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  feedbackDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  feedbackText: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Issue Card
  issueCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  issueMeta: {
    flex: 1,
  },
  issueType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  issueCustomer: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  issueStatus: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  issueStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  issueDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 10,
    lineHeight: 18,
  },
});
