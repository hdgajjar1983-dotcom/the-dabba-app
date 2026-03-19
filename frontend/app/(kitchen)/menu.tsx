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
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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
  warning: '#E65100',
};

const CATEGORY_ICONS: Record<string, string> = {
  roti: 'pizza-outline',
  sabji: 'leaf-outline',
  dal: 'water-outline',
  rice: 'restaurant-outline',
  salad: 'nutrition-outline',
  extra: 'add-circle-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  roti: '#E65100',
  sabji: '#2E7D32',
  dal: '#1565C0',
  rice: '#7B1FA2',
  salad: '#00838F',
  extra: '#C41E3A',
};

interface Dish {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  quantity_per_tiffin: number;
  unit: string;
}

interface MenuDay {
  date: string;
  dinner_items: Dish[];
}

// Animated chip for dish selection
const DishChip = ({ dish, selected, onToggle }: { dish: Dish; selected: boolean; onToggle: () => void }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress}>
      <Animated.View style={[
        styles.dishChip,
        selected && styles.dishChipSelected,
        { borderColor: CATEGORY_COLORS[dish.category] || COLORS.border },
        animatedStyle
      ]}>
        <View style={[
          styles.chipIcon,
          { backgroundColor: selected ? CATEGORY_COLORS[dish.category] : COLORS.cream }
        ]}>
          <Ionicons 
            name={selected ? 'checkmark' : (CATEGORY_ICONS[dish.category] as any || 'restaurant')} 
            size={16} 
            color={selected ? '#FFF' : CATEGORY_COLORS[dish.category]} 
          />
        </View>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{dish.name}</Text>
        <Text style={styles.chipQty}>{dish.quantity_per_tiffin} {dish.unit}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function MenuManagement() {
  const [menu, setMenu] = useState<MenuDay[]>([]);
  const [dishesByCategory, setDishesByCategory] = useState<Record<string, Dish[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('roti');
  const [isSaving, setIsSaving] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const response = await kitchenAPI.getMenu();
      setMenu(response.data.menu || []);
      setDishesByCategory(response.data.dishes_by_category || {});
      setCategories(response.data.categories || ['roti', 'sabji', 'dal', 'rice', 'salad', 'extra']);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    return menu.find(m => m.date === date);
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

  const openMenuBuilder = (date: string) => {
    setSelectedDate(date);
    const dayMenu = getMenuForDate(date);
    const existingIds = dayMenu?.dinner_items?.map(d => d.id) || [];
    setSelectedItems(existingIds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleItem = (dishId: string) => {
    setSelectedItems(prev => 
      prev.includes(dishId) 
        ? prev.filter(id => id !== dishId)
        : [...prev, dishId]
    );
  };

  const handleSaveMenu = async () => {
    if (selectedItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please select at least one item for dinner');
      return;
    }

    setIsSaving(true);
    try {
      await kitchenAPI.setMenuDay({
        date: selectedDate,
        dinner_item_ids: selectedItems,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Dinner dabba set with ${selectedItems.length} items!`);
      setSelectedDate('');
      fetchMenu();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save dabba');
    } finally {
      setIsSaving(false);
    }
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

  // If a date is selected, show the menu builder
  if (selectedDate) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.builderHeader}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedDate('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
          </TouchableOpacity>
          <View>
            <Text style={styles.builderTitle}>Build Daily Dabba</Text>
            <Text style={styles.builderSubtitle}>{formatDate(selectedDate).day}, {formatDate(selectedDate).month} {formatDate(selectedDate).date}</Text>
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryTab,
                activeCategory === cat && styles.categoryTabActive,
                { borderColor: CATEGORY_COLORS[cat] }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory(cat);
              }}
            >
              <Ionicons 
                name={CATEGORY_ICONS[cat] as any} 
                size={18} 
                color={activeCategory === cat ? '#FFF' : CATEGORY_COLORS[cat]} 
              />
              <Text style={[
                styles.categoryTabText,
                activeCategory === cat && styles.categoryTabTextActive
              ]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dishes for selected category */}
        <ScrollView style={styles.dishesContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>
            Tap to select {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} items
          </Text>
          <View style={styles.dishesGrid}>
            {(dishesByCategory[activeCategory] || []).map((dish, index) => (
              <Animated.View 
                key={dish.id}
                entering={FadeInDown.delay(index * 50).springify()}
              >
                <DishChip
                  dish={dish}
                  selected={selectedItems.includes(dish.id)}
                  onToggle={() => toggleItem(dish.id)}
                />
              </Animated.View>
            ))}
          </View>
          {(dishesByCategory[activeCategory] || []).length === 0 && (
            <Text style={styles.emptyText}>No {activeCategory} items available. Add some in Manage Dabba.</Text>
          )}
        </ScrollView>

        {/* Selected Summary */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryCount}>{selectedItems.length}</Text>
            <Text style={styles.summaryLabel}>items selected</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSaveMenu}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.goldLight} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.goldLight} />
                <Text style={styles.saveBtnText}>Set Dabba</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
        <Text style={styles.title}>Daily Dinner Dabba</Text>
        <Text style={styles.subtitle}>Tap a day to build the dinner dabba</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {next14Days.map((date, index) => {
          const formatted = formatDate(date);
          const dayMenu = getMenuForDate(date);
          const itemCount = dayMenu?.dinner_items?.length || 0;
          const isToday = index === 0;
          
          return (
            <Animated.View 
              key={date}
              entering={FadeInDown.delay(150 + index * 40).springify()}
            >
              <TouchableOpacity
                style={[styles.dayCard, isToday && styles.dayCardToday]}
                onPress={() => openMenuBuilder(date)}
              >
                <View style={[styles.dateBox, isToday && styles.dateBoxToday]}>
                  <Text style={[styles.dateDay, isToday && styles.dateDayToday]}>{formatted.day}</Text>
                  <Text style={[styles.dateNum, isToday && styles.dateNumToday]}>{formatted.date}</Text>
                  <Text style={[styles.dateMonth, isToday && styles.dateMonthToday]}>{formatted.month}</Text>
                </View>
                <View style={styles.menuPreview}>
                  <Text style={styles.mealLabel}>Dinner</Text>
                  {itemCount > 0 ? (
                    <View style={styles.menuItems}>
                      {dayMenu?.dinner_items?.slice(0, 3).map((item, i) => (
                        <View key={i} style={[styles.menuItemBadge, { backgroundColor: CATEGORY_COLORS[item.category] + '20' }]}>
                          <Text style={[styles.menuItemText, { color: CATEGORY_COLORS[item.category] }]}>
                            {item.name}
                          </Text>
                        </View>
                      ))}
                      {itemCount > 3 && (
                        <Text style={styles.moreItems}>+{itemCount - 3} more</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.notSetText}>Tap to set dinner menu</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayCardToday: {
    borderColor: COLORS.maroon,
    borderWidth: 2,
  },
  dateBox: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    marginRight: 14,
  },
  dateBoxToday: {
    backgroundColor: COLORS.maroon,
  },
  dateDay: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  dateDayToday: {
    color: COLORS.goldLight,
  },
  dateNum: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateNumToday: {
    color: '#FFF',
  },
  dateMonth: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  dateMonthToday: {
    color: COLORS.goldLight,
  },
  menuPreview: {
    flex: 1,
  },
  mealLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  menuItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  menuItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreItems: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
    alignSelf: 'center',
  },
  notSetText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  // Builder styles
  builderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  builderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  builderSubtitle: {
    fontSize: 14,
    color: COLORS.maroon,
    marginTop: 2,
  },
  categoryTabs: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryTabTextActive: {
    color: '#FFF',
  },
  dishesContainer: {
    flex: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  dishesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  dishChipSelected: {
    backgroundColor: COLORS.cream,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.maroon,
  },
  chipQty: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
});
