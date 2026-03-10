import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { kitchenAPI } from '../../src/services/api';
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
  warning: '#E65100',
  warningLight: '#FFF3E0',
  danger: '#C41E3A',
  dangerLight: '#FFEBEE',
  inputBg: '#FAF6F1',
  info: '#1565C0',
};

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features?: string[];
  is_active: boolean;
}

// Plan Card with inline editing
const PlanCard = ({
  plan,
  index,
  onUpdate,
  onDelete,
}: {
  plan: Plan;
  index: number;
  onUpdate: (id: string, data: Partial<Plan>) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(plan.name);
  const [editPrice, setEditPrice] = useState(plan.price.toString());
  const [editDesc, setEditDesc] = useState(plan.description || '');
  
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSave = () => {
    const price = parseFloat(editPrice);
    if (!editName.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdate(plan.id, {
      name: editName.trim(),
      price,
      description: editDesc.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(plan.name);
    setEditPrice(plan.price.toString());
    setEditDesc(plan.description || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(plan.id) },
      ]
    );
  };

  const handleToggleActive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate(plan.id, { is_active: !plan.is_active });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={[styles.planCard, !plan.is_active && styles.planCardInactive, animatedStyle]}
    >
      {isEditing ? (
        // Edit Mode
        <View style={styles.editContainer}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Edit Plan</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeEditBtn}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Plan Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g., Basic Dabba"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Price (CAD/week)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Brief description of the plan..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // View Mode
        <>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, !plan.is_active && styles.planNameInactive]}>
                {plan.name}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>${plan.price.toFixed(2)}</Text>
                <Text style={styles.priceUnit}>/week</Text>
              </View>
            </View>
            <View style={styles.planActions}>
              <TouchableOpacity 
                style={[styles.toggleBtn, plan.is_active && styles.toggleBtnActive]} 
                onPress={handleToggleActive}
              >
                <Ionicons 
                  name={plan.is_active ? 'checkmark-circle' : 'pause-circle'} 
                  size={20} 
                  color={plan.is_active ? COLORS.success : COLORS.textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {plan.description && (
            <Text style={styles.planDesc} numberOfLines={2}>
              {plan.description}
            </Text>
          )}
          
          {plan.features && plan.features.length > 0 && (
            <View style={styles.featuresContainer}>
              {plan.features.slice(0, 3).map((feature, i) => (
                <View key={i} style={styles.featurePill}>
                  <Ionicons name="checkmark" size={12} color={COLORS.success} />
                  <Text style={styles.featureText} numberOfLines={1}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.cardFooter}>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsEditing(true);
              }}
            >
              <Ionicons name="pencil" size={16} color={COLORS.maroon} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
          
          {!plan.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
};

// Add New Plan Modal
const AddPlanModal = ({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; price: number; description?: string }) => void;
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    const priceNum = parseFloat(price);
    if (!name.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd({
      name: name.trim(),
      price: priceNum,
      description: description.trim() || undefined,
    });
    
    // Reset form
    setName('');
    setPrice('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Subscription Plan</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Plan Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Premium Dabba"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Price (CAD/week) *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what's included in this plan..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.addPlanBtn} onPress={handleAdd}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addPlanBtnText}>Create Plan</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function KitchenPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await kitchenAPI.getPlans();
      setPlans(response.data.plans || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchPlans();
  }, [fetchPlans]);

  const handleUpdatePlan = async (id: string, data: Partial<Plan>) => {
    try {
      await kitchenAPI.updatePlan(id, data as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchPlans();
    } catch (error: any) {
      console.error('Error updating plan:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await kitchenAPI.deletePlan(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete plan');
    }
  };

  const handleAddPlan = async (data: { name: string; price: number; description?: string }) => {
    try {
      await kitchenAPI.createPlan({
        ...data,
        is_active: true,
      });
      fetchPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create plan');
    }
  };

  const activePlans = plans.filter(p => p.is_active).length;

  return (
    <SafeAreaView style={styles.container}>
      <AddPlanModal 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPlan}
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Subscription Plans</Text>
            <Text style={styles.subtitle}>{activePlans} active of {plans.length} plans</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={28} color={COLORS.card} />
          </TouchableOpacity>
        </Animated.View>

        {/* Info Banner */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Tap on a plan to edit its name, price, or description. Toggle the checkmark to activate/deactivate.
          </Text>
        </Animated.View>

        {/* Plans List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.planCard, styles.skeletonCard]} />
            ))}
          </View>
        ) : plans.length === 0 ? (
          <Animated.View entering={FadeIn} style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Plans Yet</Text>
            <Text style={styles.emptyText}>Create your first subscription plan to get started</Text>
            <TouchableOpacity 
              style={styles.createFirstBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createFirstBtnText}>Create First Plan</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.plansList}>
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                onUpdate={handleUpdatePlan}
                onDelete={handleDeletePlan}
              />
            ))}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
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
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  loadingContainer: {
    gap: 16,
  },
  skeletonCard: {
    height: 140,
    backgroundColor: COLORS.card,
    opacity: 0.5,
  },
  plansList: {
    gap: 16,
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardInactive: {
    opacity: 0.7,
    backgroundColor: '#F9F6F2',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  planNameInactive: {
    color: COLORS.textLight,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.maroon,
  },
  priceUnit: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.successLight,
  },
  planDesc: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.maroon,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
  },
  // Edit Mode Styles
  editContainer: {
    gap: 16,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  closeEditBtn: {
    padding: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    position: 'absolute',
    left: 16,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.maroon,
    zIndex: 1,
  },
  priceInput: {
    flex: 1,
    paddingLeft: 36,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.cream,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
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
  addPlanBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.maroon,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },
  addPlanBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  createFirstBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  createFirstBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
