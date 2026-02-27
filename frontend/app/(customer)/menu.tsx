import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { menuAPI } from '../../src/services/api';

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

export default function MenuScreen() {
  const [menu, setMenu] = useState<DayMenu[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const response = await menuAPI.getWeeklyMenu();
      const weeklyMenu = response.data.menu || [];
      setMenu(weeklyMenu);
      
      // Find today's index
      const today = new Date().toISOString().split('T')[0];
      const todayIndex = weeklyMenu.findIndex((item: DayMenu) => item.date === today);
      setSelectedDay(todayIndex >= 0 ? todayIndex : 0);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMenu();
  }, [fetchMenu]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
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

  const selectedMenu = menu[selectedDay];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Menu</Text>
        <Text style={styles.subtitle}>Plan your meals for the week</Text>
      </View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelector}
      >
        {menu.map((day, index) => (
          <TouchableOpacity
            key={day.date}
            style={[
              styles.dayButton,
              selectedDay === index && styles.dayButtonActive,
              isToday(day.date) && styles.dayButtonToday,
            ]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[
              styles.dayName,
              selectedDay === index && styles.dayNameActive,
            ]}>
              {day.day.substring(0, 3)}
            </Text>
            <Text style={[
              styles.dayDate,
              selectedDay === index && styles.dayDateActive,
            ]}>
              {formatDate(day.date)}
            </Text>
            {isToday(day.date) && (
              <View style={styles.todayDot} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {selectedMenu ? (
          <View style={styles.menuContent}>
            <View style={styles.selectedDateHeader}>
              <Text style={styles.selectedDay}>{selectedMenu.day}</Text>
              <Text style={styles.selectedDate}>{formatDate(selectedMenu.date)}</Text>
            </View>

            {/* Lunch Card */}
            <View style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealIconContainer}>
                  <Ionicons name="sunny" size={24} color={COLORS.warning} />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTime}>Lunch</Text>
                  <Text style={styles.mealTimeDetail}>12:00 PM - 2:00 PM</Text>
                </View>
              </View>
              <View style={styles.mealDetails}>
                <Text style={styles.mealName}>{selectedMenu.lunch.name}</Text>
                <Text style={styles.mealDescription}>{selectedMenu.lunch.description}</Text>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeBadgeText}>{selectedMenu.lunch.type}</Text>
                </View>
              </View>
            </View>

            {/* Dinner Card */}
            <View style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={[styles.mealIconContainer, styles.dinnerIcon]}>
                  <Ionicons name="moon" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTime}>Dinner</Text>
                  <Text style={styles.mealTimeDetail}>7:00 PM - 9:00 PM</Text>
                </View>
              </View>
              <View style={styles.mealDetails}>
                <Text style={styles.mealName}>{selectedMenu.dinner.name}</Text>
                <Text style={styles.mealDescription}>{selectedMenu.dinner.description}</Text>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeBadgeText}>{selectedMenu.dinner.type}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyStateText}>No menu available</Text>
          </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  daySelector: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  dayButton: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayButtonToday: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  dayNameActive: {
    color: COLORS.white,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayDateActive: {
    color: COLORS.white,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  menuContent: {
    flex: 1,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDay: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  mealCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dinnerIcon: {
    backgroundColor: COLORS.primaryLight,
  },
  mealInfo: {
    flex: 1,
  },
  mealTime: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  mealTimeDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  mealDetails: {
    flex: 1,
  },
  mealName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 22,
    marginBottom: 12,
  },
  mealTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
