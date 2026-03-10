import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
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
import { subscriptionAPI, customerAPI, weatherAPI, extrasAPI } from '../../src/services/api';
import DabbaLogo, { BRAND_COLORS } from '../../src/components/DabbaLogo';
import { AnimatedCard, PulsingDot, Skeleton, SkeletonCard } from '../../src/components/AnimatedComponents';
import TiffinConcierge, { ChatButton } from '../components/TiffinConcierge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#E65100',
  warningLight: '#FFF3E0',
  danger: '#C41E3A',
  dangerLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',
};

const WEATHER_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  normal: { bg: COLORS.successLight, text: COLORS.success, icon: 'checkmark-circle' },
  caution: { bg: COLORS.warningLight, text: COLORS.warning, icon: 'alert-circle' },
  warning: { bg: '#FFE0B2', text: '#E65100', icon: 'snow' },
  severe: { bg: COLORS.dangerLight, text: COLORS.danger, icon: 'warning' },
};

const SPICE_OPTIONS = [
  { value: 'mild', label: 'Mild 🌶️', color: '#4CAF50' },
  { value: 'medium', label: 'Medium 🌶️🌶️', color: '#FF9800' },
  { value: 'spicy', label: 'Spicy 🌶️🌶️🌶️', color: '#F44336' },
];

interface DayPlan {
  date: string;
  day_name: string;
  is_today: boolean;
  is_skipped: boolean;
  can_skip: boolean;
  dinner_items: { id: string; name: string; category: string; quantity: number; unit: string }[];
  item_summary: string;
  add_ons: { name: string; price: number }[];
}

interface WeatherStatus {
  condition: string;
  status: string;
  message: string;
  delay_minutes: number;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  delivery_address: string;
  skipped_meals: { date: string; meal_type: string }[];
}

// Category icons for menu items with premium styling
const CATEGORY_ICONS: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  roti: { icon: 'pizza-outline', color: '#E65100', bgColor: '#FFF3E0', label: 'Roti' },
  sabji: { icon: 'leaf-outline', color: '#2E7D32', bgColor: '#E8F5E9', label: 'Sabji' },
  dal: { icon: 'water-outline', color: '#1565C0', bgColor: '#E3F2FD', label: 'Dal' },
  rice: { icon: 'restaurant-outline', color: '#7B1FA2', bgColor: '#F3E5F5', label: 'Rice' },
  salad: { icon: 'nutrition-outline', color: '#00838F', bgColor: '#E0F7FA', label: 'Salad' },
  extra: { icon: 'add-circle-outline', color: '#C41E3A', bgColor: '#FFEBEE', label: 'Extra' },
};

// Beautiful Menu Item Component
const MenuItemCard = ({ item, category }: { item: { id: string; name: string; category: string; quantity: number; unit: string }; category: string }) => {
  const catInfo = CATEGORY_ICONS[category] || CATEGORY_ICONS.sabji;
  
  return (
    <View style={menuStyles.menuItemCard}>
      <View style={[menuStyles.menuItemIconBg, { backgroundColor: catInfo.bgColor }]}>
        <Ionicons name={catInfo.icon as any} size={20} color={catInfo.color} />
      </View>
      <View style={menuStyles.menuItemInfo}>
        <Text style={menuStyles.menuItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={[menuStyles.menuItemCategory, { color: catInfo.color }]}>{catInfo.label}</Text>
      </View>
      <View style={[menuStyles.menuItemQtyBadge, { backgroundColor: catInfo.bgColor }]}>
        <Text style={[menuStyles.menuItemQtyText, { color: catInfo.color }]}>
          {item.quantity} {item.unit || 'pcs'}
        </Text>
      </View>
    </View>
  );
};

// Day Card Component - Beautiful Menu Display
const DayCard = ({ day, onSkip, onAddExtra, index }: { 
  day: DayPlan; 
  onSkip: () => void; 
  onAddExtra: () => void;
  index: number;
}) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formattedDate = new Date(day.date);
  const dateNum = formattedDate.getDate();
  const monthShort = formattedDate.toLocaleDateString('en-US', { month: 'short' });

  // Calculate total items by category
  const categoryTotals = day.dinner_items.reduce((acc, item) => {
    const cat = item.category || 'sabji';
    if (!acc[cat]) acc[cat] = { count: 0, items: [] };
    acc[cat].count += item.quantity;
    acc[cat].items.push(item);
    return acc;
  }, {} as Record<string, { count: number; items: typeof day.dinner_items }>);

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 80).springify()}
      style={[styles.dayCard, day.is_today && styles.dayCardToday, day.is_skipped && styles.dayCardSkipped, animatedStyle]}
    >
      {/* Date Header */}
      <View style={[styles.dayHeader, day.is_today && styles.dayHeaderToday]}>
        <View style={styles.dayHeaderLeft}>
          <View style={[styles.dateCircle, day.is_today && styles.dateCircleToday]}>
            <Text style={[styles.dateNum, day.is_today && styles.dateNumToday]}>{dateNum}</Text>
          </View>
          <View>
            <Text style={[styles.dayName, day.is_today && styles.dayNameToday]}>
              {day.is_today ? 'TODAY' : day.day_name.substring(0, 3).toUpperCase()}
            </Text>
            <Text style={[styles.monthText, day.is_today && styles.monthTextToday]}>{monthShort}</Text>
          </View>
        </View>
        {day.is_skipped ? (
          <View style={styles.skippedBadge}>
            <Ionicons name="close-circle" size={14} color={COLORS.danger} />
            <Text style={styles.skippedText}>Skipped</Text>
          </View>
        ) : day.can_skip ? (
          <TouchableOpacity style={[styles.skipBtn, day.is_today && styles.skipBtnToday]} onPress={onSkip}>
            <Text style={[styles.skipBtnText, day.is_today && styles.skipBtnTextToday]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color={day.is_today ? 'rgba(255,255,255,0.6)' : COLORS.textLight} />
          </View>
        )}
      </View>

      {/* Beautiful Menu Items Display */}
      <View style={styles.dayContent}>
        {day.dinner_items.length > 0 ? (
          <View style={menuStyles.menuGrid}>
            {day.dinner_items.slice(0, 4).map((item, idx) => (
              <MenuItemCard key={item.id || idx} item={item} category={item.category || 'sabji'} />
            ))}
            {day.dinner_items.length > 4 && (
              <View style={menuStyles.moreItemsBadge}>
                <Text style={menuStyles.moreItemsText}>+{day.dinner_items.length - 4} more</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noMenuContainer}>
            <Ionicons name="restaurant-outline" size={28} color={COLORS.textLight} />
            <Text style={styles.noMenuText}>Menu coming soon</Text>
          </View>
        )}
      </View>

      {/* Quick Stats Bar */}
      {day.dinner_items.length > 0 && !day.is_skipped && (
        <View style={menuStyles.quickStatsBar}>
          {Object.entries(categoryTotals).slice(0, 4).map(([cat, data]) => {
            const catInfo = CATEGORY_ICONS[cat] || CATEGORY_ICONS.sabji;
            return (
              <View key={cat} style={menuStyles.quickStatItem}>
                <View style={[menuStyles.quickStatIcon, { backgroundColor: catInfo.bgColor }]}>
                  <Ionicons name={catInfo.icon as any} size={14} color={catInfo.color} />
                </View>
                <Text style={menuStyles.quickStatText}>{data.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Extra Button */}
      {!day.is_skipped && (
        <TouchableOpacity style={styles.addExtraBtn} onPress={onAddExtra}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.maroon} />
          <Text style={styles.addExtraText}>Add Extra</Text>
        </TouchableOpacity>
      )}

      {/* Add-ons */}
      {day.add_ons.length > 0 && (
        <View style={styles.addOnsContainer}>
          {day.add_ons.map((addon, i) => (
            <View key={i} style={styles.addOnPill}>
              <Text style={styles.addOnText}>+{addon.name}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

// Menu-specific styles
const menuStyles = StyleSheet.create({
  menuGrid: {
    gap: 8,
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  menuItemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuItemCategory: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  menuItemQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuItemQtyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  moreItemsBadge: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreItemsText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  quickStatsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.cream,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});

// Rating Modal Component
const RatingModal = ({ visible, onClose, onRate, date }: any) => {
  if (!visible) return null;
  
  const ratings = [
    { value: 'yummy', emoji: '😋', label: 'Yummy!' },
    { value: 'good', emoji: '👍', label: 'Good' },
    { value: 'bad', emoji: '👎', label: 'Not Great' },
  ];

  return (
    <Animated.View entering={FadeIn} style={styles.ratingOverlay}>
      <View style={styles.ratingModal}>
        <Text style={styles.ratingTitle}>How was yesterday&apos;s dinner?</Text>
        <View style={styles.ratingOptions}>
          {ratings.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={styles.ratingBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRate(r.value);
              }}
            >
              <Text style={styles.ratingEmoji}>{r.emoji}</Text>
              <Text style={styles.ratingLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.ratingSkip} onPress={onClose}>
          <Text style={styles.ratingSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [weeklyPlan, setWeeklyPlan] = useState<DayPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<any>(null);
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus | null>(null);
  const [spiceLevel, setSpiceLevel] = useState('medium');
  const [walletBalance, setWalletBalance] = useState(0);
  const [extras, setExtras] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showSpiceSelector, setShowSpiceSelector] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [weeklyRes, subRes, deliveryRes, weatherRes, prefsRes, extrasRes] = await Promise.all([
        customerAPI.getWeeklyPlan().catch(() => ({ data: { days: [] } })),
        subscriptionAPI.getSubscription().catch(() => null),
        customerAPI.getDeliveryStatus().catch(() => null),
        weatherAPI.getStatus().catch(() => null),
        customerAPI.getPreferences().catch(() => ({ data: { spice_level: 'medium' } })),
        extrasAPI.getExtras().catch(() => ({ data: { extras: [] } })),
      ]);

      setWeeklyPlan(weeklyRes.data.days || []);
      setWalletBalance(weeklyRes.data.wallet_balance || 0);
      
      if (subRes?.data) setSubscription(subRes.data);
      if (deliveryRes?.data) setDeliveryStatus(deliveryRes.data);
      if (weatherRes?.data) setWeatherStatus(weatherRes.data);
      if (prefsRes?.data) setSpiceLevel(prefsRes.data.spice_level || 'medium');
      if (extrasRes?.data) setExtras(extrasRes.data.extras || []);
      
      // Check if we should show rating (yesterday's dinner)
      // Show only once per session
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData();
  }, [fetchData]);

  const handleSkipMeal = async (day: DayPlan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Skip Dinner',
      `Skip ${day.day_name}'s dinner and receive $12 CAD credit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip & Credit',
          onPress: async () => {
            try {
              await subscriptionAPI.skipMeal({
                date: day.date,
                meal_type: 'dinner',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', '$12 CAD credited to your wallet!');
              fetchData();
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to skip meal');
            }
          },
        },
      ]
    );
  };

  const handleAddExtra = (day: DayPlan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Show extras picker
    Alert.alert(
      'Add Extra',
      'Select an add-on for ' + day.day_name,
      [
        ...extras.slice(0, 4).map(e => ({
          text: `${e.name} - $${e.price.toFixed(2)}`,
          onPress: async () => {
            try {
              await customerAPI.addExtra({
                date: day.date,
                item_id: e.id,
                quantity: 1
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Added!', `${e.name} added for ${day.day_name}`);
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to add extra');
            }
          }
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleRateMeal = async (rating: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      const res = await customerAPI.rateMeal({
        date: yesterday.toISOString().split('T')[0],
        rating,
      });
      
      setShowRating(false);
      
      if (res.data.needs_feedback && rating === 'bad') {
        Alert.prompt(
          'Help us improve',
          'What could we do better?',
          async (feedback) => {
            if (feedback) {
              await customerAPI.rateMeal({
                date: yesterday.toISOString().split('T')[0],
                rating,
                feedback,
              });
            }
          }
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setShowRating(false);
    }
  };

  const handleSpiceChange = async (level: string) => {
    setSpiceLevel(level);
    setShowSpiceSelector(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await customerAPI.updatePreferences({ level });
    } catch (err) {
      console.error('Failed to update preferences');
    }
  };

  const getDeliveryIcon = () => {
    switch (deliveryStatus?.status) {
      case 'out_for_delivery': return 'bicycle';
      case 'delivered': return 'checkmark-circle';
      case 'preparing': return 'restaurant';
      default: return 'time';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(500)}>
            <DabbaLogo size={100} />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.loadingContent}>
            <SkeletonCard style={styles.skeletonCard} />
            <SkeletonCard style={styles.skeletonCard} />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RatingModal 
        visible={showRating} 
        onClose={() => setShowRating(false)}
        onRate={handleRateMeal}
      />
      
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
              <Text style={styles.greeting}>Namaste, {user?.name?.split(' ')[0] || 'there'}!</Text>
              <Text style={styles.subGreeting}>Halifax&apos;s finest home-cooked meals</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.walletBadge}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="wallet" size={16} color={COLORS.success} />
              <Text style={styles.walletText}>${walletBalance.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Weather Alert Banner */}
        {weatherStatus && weatherStatus.status !== 'normal' && (
          <Animated.View 
            entering={FadeInDown.delay(150).springify()}
            style={[
              styles.weatherBanner,
              { backgroundColor: WEATHER_COLORS[weatherStatus.status]?.bg || COLORS.warningLight }
            ]}
          >
            <Ionicons 
              name={WEATHER_COLORS[weatherStatus.status]?.icon as any || 'alert'} 
              size={20} 
              color={WEATHER_COLORS[weatherStatus.status]?.text || COLORS.warning} 
            />
            <Text style={[styles.weatherText, { color: WEATHER_COLORS[weatherStatus.status]?.text }]}>
              {weatherStatus.message}
            </Text>
          </Animated.View>
        )}

        {/* Spice Preference */}
        <AnimatedCard index={1} style={styles.spiceCard}>
          <View style={styles.spiceHeader}>
            <Text style={styles.spiceTitle}>Your Spice Level</Text>
            <TouchableOpacity 
              style={styles.spiceSelector}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSpiceSelector(!showSpiceSelector);
              }}
            >
              <Text style={styles.spiceValue}>
                {SPICE_OPTIONS.find(o => o.value === spiceLevel)?.label || 'Medium 🌶️🌶️'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.maroon} />
            </TouchableOpacity>
          </View>
          {showSpiceSelector && (
            <Animated.View entering={FadeIn} style={styles.spiceOptions}>
              {SPICE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.spiceOption, spiceLevel === opt.value && styles.spiceOptionActive]}
                  onPress={() => handleSpiceChange(opt.value)}
                >
                  <Text style={styles.spiceOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </AnimatedCard>

        {/* Delivery Status Card */}
        {subscription && deliveryStatus && (
          <AnimatedCard index={2} style={styles.deliveryCard}>
            <View style={styles.deliveryHeader}>
              <View style={styles.deliveryIconPulse}>
                <Ionicons name={getDeliveryIcon()} size={24} color={COLORS.card} />
              </View>
              <View style={styles.deliveryHeaderText}>
                <Text style={styles.deliveryTitle}>
                  {deliveryStatus.status === 'out_for_delivery' ? 'Your Dabba is on the way!' : 
                   deliveryStatus.status === 'delivered' ? 'Delivered!' :
                   deliveryStatus.status === 'preparing' ? 'Being Prepared' : 
                   deliveryStatus.status === 'skipped' ? 'Meal Skipped' : 'Scheduled for Today'}
                </Text>
                <Text style={styles.deliverySubtitle}>
                  {deliveryStatus.estimated_time || 'Delivery at 4:00 PM'}
                </Text>
              </View>
            </View>
            
            {deliveryStatus.status !== 'skipped' && (
              <View style={styles.progressContainer}>
                {['Ordered', 'Preparing', 'On Way', 'Delivered'].map((step, index) => {
                  const isComplete = 
                    index === 0 || 
                    (index === 1 && deliveryStatus?.status && deliveryStatus.status !== 'pending') ||
                    (index === 2 && (deliveryStatus?.status === 'out_for_delivery' || deliveryStatus?.status === 'delivered')) ||
                    (index === 3 && deliveryStatus?.status === 'delivered');
                  
                  return (
                    <React.Fragment key={step}>
                      <View style={styles.progressStep}>
                        <View style={[styles.progressDot, isComplete && styles.progressDotComplete]}>
                          {isComplete && <Ionicons name="checkmark" size={10} color="#FFF" />}
                        </View>
                        <Text style={[styles.progressLabel, isComplete && styles.progressLabelActive]}>{step}</Text>
                      </View>
                      {index < 3 && <View style={[styles.progressLine, isComplete && styles.progressLineComplete]} />}
                    </React.Fragment>
                  );
                })}
              </View>
            )}
          </AnimatedCard>
        )}

        {/* 7-Day Dinner Discovery */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>7-Day Dinner Plan</Text>
            <TouchableOpacity onPress={() => setShowRating(true)}>
              <Text style={styles.rateLink}>Rate Yesterday&apos;s Meal</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weeklySlider}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH * 0.72 + 12}
          >
            {weeklyPlan.map((day, index) => (
              <DayCard
                key={day.date}
                day={day}
                index={index}
                onSkip={() => handleSkipMeal(day)}
                onAddExtra={() => handleAddExtra(day)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Quick Stats */}
        {subscription && (
          <AnimatedCard index={6} style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{subscription.plan}</Text>
                <Text style={styles.statLabel}>Plan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${walletBalance.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Credits</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{weeklyPlan.filter(d => d.is_skipped).length}</Text>
                <Text style={styles.statLabel}>Skipped</Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(500)} style={styles.footer}>
          <Text style={styles.footerText}>~ Ghar Ka Swad, Roz ~</Text>
          <Text style={styles.footerSubtext}>Halifax, Nova Scotia</Text>
        </Animated.View>
      </ScrollView>

      {/* Tiffin Concierge Chatbot */}
      <TiffinConcierge 
        isVisible={showChatbot} 
        onClose={() => setShowChatbot(false)} 
      />

      {/* Floating Chat Button */}
      {!showChatbot && (
        <View style={styles.chatButtonContainer}>
          <ChatButton onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowChatbot(true);
          }} />
        </View>
      )}
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
  skeletonCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
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
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subGreeting: {
    fontSize: 12,
    color: COLORS.gold,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  // Weather Banner
  weatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  weatherText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  // Spice Preference
  spiceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spiceTitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  spiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spiceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  spiceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  spiceOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.cream,
  },
  spiceOptionActive: {
    backgroundColor: COLORS.maroon,
  },
  spiceOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Delivery Card
  deliveryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotComplete: {
    backgroundColor: COLORS.success,
  },
  progressLine: {
    height: 3,
    width: 36,
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
  progressLabelActive: {
    color: COLORS.success,
    fontWeight: '600',
  },
  // Section
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  rateLink: {
    fontSize: 13,
    color: COLORS.maroon,
    fontWeight: '600',
  },
  // Weekly Slider
  weeklySlider: {
    paddingRight: 20,
  },
  dayCard: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dayCardToday: {
    borderColor: COLORS.maroon,
    borderWidth: 2,
  },
  dayCardSkipped: {
    opacity: 0.6,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.cream,
  },
  dayHeaderToday: {
    backgroundColor: COLORS.maroon,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dateCircleToday: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  dateNumToday: {
    color: '#FFF',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  dayNameToday: {
    color: COLORS.goldLight,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1,
  },
  monthTextToday: {
    color: '#FFF',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  dayDateToday: {
    color: '#FFF',
  },
  skipBtn: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  skipBtnToday: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  skipBtnTextToday: {
    color: '#FFF',
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skippedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  lockedBadge: {
    padding: 6,
  },
  dayContent: {
    padding: 14,
    minHeight: 100,
  },
  noMenuContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noMenuText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 8,
  },
  addExtraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    gap: 6,
  },
  addExtraText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.maroon,
  },
  addOnsContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingTop: 0,
    gap: 6,
  },
  addOnPill: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addOnText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  // Stats Card
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.maroon,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  // Rating Modal
  ratingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  ratingModal: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  ratingBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.cream,
    minWidth: 80,
  },
  ratingEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  ratingSkip: {
    marginTop: 20,
  },
  ratingSkipText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  // Footer
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
  footerSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  // Chat Button
  chatButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
});
