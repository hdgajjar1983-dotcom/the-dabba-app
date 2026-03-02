import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { kitchenAPI } from '../../src/services/api';
import { BRAND_COLORS } from '../../src/components/DabbaLogo';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
};

interface Dish {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
}

interface MenuDay {
  date: string;
  lunch: Dish | null;
  dinner: Dish | null;
}

export default function MenuManagement() {
  const [menu, setMenu] = useState<MenuDay[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedDishId, setSelectedDishId] = useState('');

  const fetchMenu = useCallback(async () => {
    try {
      const response = await kitchenAPI.getMenu();
      setMenu(response.data.menu || []);
      setDishes(response.data.dishes || []);
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

  const generateNext14Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const getMenuForDate = (date: string) => {
    return menu.find(m => m.date === date) || { date, lunch: null, dinner: null };
  };

  const openSetMenu = (date: string, meal: 'lunch' | 'dinner') => {
    setSelectedDate(date);
    setSelectedMeal(meal);
    const dayMenu = getMenuForDate(date);
    setSelectedDishId(meal === 'lunch' ? dayMenu.lunch?.id || '' : dayMenu.dinner?.id || '');
    setShowModal(true);
  };

  const handleSetMenu = async () => {
    if (!selectedDishId) {
      Alert.alert('Error', 'Please select a dish');
      return;
    }

    try {
      const dayMenu = getMenuForDate(selectedDate);
      await kitchenAPI.setMenuDay({
        date: selectedDate,
        lunch_dish_id: selectedMeal === 'lunch' ? selectedDishId : dayMenu.lunch?.id || '',
        dinner_dish_id: selectedMeal === 'dinner' ? selectedDishId : dayMenu.dinner?.id || '',
      });
      Alert.alert('Success', 'Menu updated!');
      setShowModal(false);
      fetchMenu();
    } catch (error) {
      Alert.alert('Error', 'Failed to update menu');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.maroon} />
        </View>
      </SafeAreaView>
    );
  }

  const next14Days = generateNext14Days();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Menu</Text>
        <Text style={styles.subtitle}>Set lunch & dinner for each day</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {next14Days.map((date) => {
          const { day, date: dateNum, month } = formatDate(date);
          const dayMenu = getMenuForDate(date);
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <View key={date} style={[styles.dayCard, isToday && styles.todayCard]}>
              <View style={styles.dateColumn}>
                <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
                <Text style={[styles.dateText, isToday && styles.todayText]}>{dateNum}</Text>
                <Text style={styles.monthText}>{month}</Text>
                {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>TODAY</Text></View>}
              </View>

              <View style={styles.mealsColumn}>
                <TouchableOpacity
                  style={[styles.mealSlot, dayMenu.lunch && styles.mealSlotFilled]}
                  onPress={() => openSetMenu(date, 'lunch')}
                >
                  <Ionicons name="sunny" size={16} color={dayMenu.lunch ? COLORS.gold : COLORS.textLight} />
                  <Text style={[styles.mealLabel, dayMenu.lunch && styles.mealLabelFilled]}>Lunch</Text>
                  <Text style={styles.mealName} numberOfLines={1}>
                    {dayMenu.lunch?.name || 'Tap to set'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mealSlot, dayMenu.dinner && styles.mealSlotFilled]}
                  onPress={() => openSetMenu(date, 'dinner')}
                >
                  <Ionicons name="moon" size={16} color={dayMenu.dinner ? COLORS.maroon : COLORS.textLight} />
                  <Text style={[styles.mealLabel, dayMenu.dinner && styles.mealLabelFilled]}>Dinner</Text>
                  <Text style={styles.mealName} numberOfLines={1}>
                    {dayMenu.dinner?.name || 'Tap to set'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Set Menu Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set {selectedMeal === 'lunch' ? 'Lunch' : 'Dinner'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {formatDate(selectedDate).day}, {formatDate(selectedDate).date} {formatDate(selectedDate).month}
            </Text>

            <ScrollView style={styles.dishList}>
              {dishes.length === 0 ? (
                <Text style={styles.noDishes}>No dishes available. Add dishes first.</Text>
              ) : (
                dishes.map((dish) => (
                  <TouchableOpacity
                    key={dish.id}
                    style={[
                      styles.dishOption,
                      selectedDishId === dish.id && styles.dishOptionSelected,
                    ]}
                    onPress={() => setSelectedDishId(dish.id)}
                  >
                    <View style={styles.dishOptionInfo}>
                      <Text style={styles.dishOptionName}>{dish.name}</Text>
                      <Text style={styles.dishOptionDesc} numberOfLines={1}>{dish.description}</Text>
                    </View>
                    {selectedDishId === dish.id && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.maroon} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSetMenu}>
              <Text style={styles.saveButtonText}>Set Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  dayCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  todayCard: {
    borderColor: COLORS.maroon,
    borderWidth: 2,
  },
  dateColumn: {
    width: 60,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingRight: 12,
    marginRight: 12,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  monthText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  todayText: {
    color: COLORS.maroon,
  },
  todayBadge: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  mealsColumn: {
    flex: 1,
    gap: 8,
  },
  mealSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  mealSlotFilled: {
    backgroundColor: '#FDF5F0',
  },
  mealLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 45,
  },
  mealLabelFilled: {
    color: COLORS.maroon,
  },
  mealName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  dishList: {
    maxHeight: 350,
  },
  noDishes: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 40,
  },
  dishOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishOptionSelected: {
    borderColor: COLORS.maroon,
    backgroundColor: '#FDF5F0',
  },
  dishOptionInfo: {
    flex: 1,
  },
  dishOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  dishOptionDesc: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: COLORS.maroon,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
});
