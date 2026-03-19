import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
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
  error: '#C41E3A',
  info: '#1565C0',
};

interface Dish {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  quantity_per_tiffin: number;
  unit: string;
  price: number;
  image_url?: string;
}

export default function DishesManagement() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('vegetarian');
  const [category, setCategory] = useState('Main Dishes');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('portion');

  const fetchDishes = useCallback(async () => {
    try {
      const response = await kitchenAPI.getDishes();
      setDishes(response.data.dishes || []);
    } catch (error) {
      console.error('Error fetching dishes:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDishes();
  }, [fetchDishes]);

  const openAddModal = () => {
    setEditingDish(null);
    setName('');
    setDescription('');
    setType('vegetarian');
    setCategory('Main Dishes');
    setQuantity('1');
    setUnit('portion');
    setShowModal(true);
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    setName(dish.name);
    setDescription(dish.description);
    setType(dish.type);
    setCategory(dish.category || 'Main Dishes');
    setQuantity((dish.quantity_per_tiffin || 1).toString());
    setUnit(dish.unit || 'portion');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const dishData = {
        name: name.trim(),
        description: description.trim(),
        type,
        category,
        quantity_per_tiffin: parseFloat(quantity) || 1,
        unit,
      };

      if (editingDish) {
        await kitchenAPI.updateDish(editingDish.id, dishData);
        Alert.alert('Success', 'Dish updated!');
      } else {
        await kitchenAPI.createDish(dishData);
        Alert.alert('Success', 'Dish created!');
      }

      setShowModal(false);
      fetchDishes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save dish');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (dish: Dish) => {
    Alert.alert('Delete Dish', `Are you sure you want to delete "${dish.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await kitchenAPI.deleteDish(dish.id);
            fetchDishes();
            Alert.alert('Success', 'Dish deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete dish');
          }
        },
      },
    ]);
  };

  const handleSeedDishes = async () => {
    Alert.alert(
      'Seed Default Dishes',
      'This will add default Gujarati dishes to your menu. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            try {
              const response = await kitchenAPI.seedDishes();
              Alert.alert('Success', response.data.message);
              fetchDishes();
            } catch (error) {
              Alert.alert('Error', 'Failed to seed dishes');
            }
          },
        },
      ]
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Items</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.seedButton} onPress={handleSeedDishes}>
            <Ionicons name="flash" size={18} color={COLORS.gold} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={24} color={COLORS.card} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {dishes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No dishes yet</Text>
            <Text style={styles.emptySubtext}>Add your first dish or seed defaults</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleSeedDishes}>
              <Ionicons name="flash" size={20} color={COLORS.card} />
              <Text style={styles.emptyButtonText}>Seed Default Dishes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dishes.map((dish) => (
            <View key={dish.id} style={styles.dishCard}>
              <View style={styles.dishHeader}>
                <View style={styles.dishInfo}>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  <View style={styles.dishMeta}>
                    <View style={styles.typeBadge}>
                      <Ionicons name="leaf" size={12} color={COLORS.success} />
                      <Text style={styles.typeText}>{dish.type}</Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: '#E3F2FD' }]}>
                      <Ionicons name="folder" size={12} color={COLORS.info} />
                      <Text style={[styles.typeText, { color: COLORS.info }]}>{dish.category || 'Uncategorized'}</Text>
                    </View>
                  </View>
                  {dish.quantity_per_tiffin && (
                    <Text style={styles.quantityText}>{dish.quantity_per_tiffin} {dish.unit || 'portion'} per tiffin</Text>
                  )}
                </View>
                <View style={styles.dishActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(dish)}>
                    <Ionicons name="pencil" size={18} color={COLORS.info} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(dish)}>
                    <Ionicons name="trash" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.dishDescription}>{dish.description}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDish ? 'Edit Item' : 'Add New Item'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Item Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Dal Tadka"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the item..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeOption, type === 'vegetarian' && styles.typeOptionActive]}
                    onPress={() => setType('vegetarian')}
                  >
                    <Ionicons name="leaf" size={18} color={type === 'vegetarian' ? COLORS.card : COLORS.success} />
                    <Text style={[styles.typeOptionText, type === 'vegetarian' && styles.typeOptionTextActive]}>
                      Vegetarian
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeOption, type === 'non-vegetarian' && styles.typeOptionActive]}
                    onPress={() => setType('non-vegetarian')}
                  >
                    <Ionicons name="restaurant" size={18} color={type === 'non-vegetarian' ? COLORS.card : COLORS.maroon} />
                    <Text style={[styles.typeOptionText, type === 'non-vegetarian' && styles.typeOptionTextActive]}>
                      Non-Veg
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.typeSelector}>
                  {['Breads', 'Main Dishes', 'Dals & Kathol', 'Rice & Grains', 'Sides & Drinks', 'Desserts'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity per Tiffin</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.textLight}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={[styles.typeSelector, { flexWrap: 'wrap' }]}>
                      {['portion', 'pieces', 'grams'].map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.categoryChip, unit === u && styles.categoryChipActive]}
                          onPress={() => setUnit(u)}
                        >
                          <Text style={[styles.categoryChipText, unit === u && styles.categoryChipTextActive]}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.goldLight} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingDish ? 'Update Item' : 'Add Item'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  seedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
  },
  dishCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  dishMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  dishActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  typeOptionActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: COLORS.card,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryChipActive: {
    backgroundColor: COLORS.maroon,
    borderColor: COLORS.maroon,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: COLORS.card,
  },
  quantityText: {
    fontSize: 12,
    color: COLORS.info,
    marginTop: 4,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.maroon,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
});
