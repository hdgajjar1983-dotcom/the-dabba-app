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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  primary: '#EA580C',
  primaryLight: '#FFF7ED',
  background: '#FDFBF7',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  success: '#10B981',
};

const PLANS = [
  {
    id: 'eco',
    name: 'Eco',
    price: 240,
    description: 'Basic vegetarian meals',
    features: ['Vegetarian only', '2 meals/day', 'Standard portions'],
    icon: 'leaf-outline',
    color: '#10B981',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 290,
    description: 'Mixed veg & non-veg meals',
    features: ['Veg & Non-veg', '2 meals/day', 'Regular portions', 'Weekend specials'],
    icon: 'restaurant-outline',
    color: COLORS.primary,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 350,
    description: 'Gourmet meals with extras',
    features: ['Premium ingredients', '2 meals/day', 'Large portions', 'Dessert included', 'Priority delivery'],
    icon: 'star-outline',
    color: '#8B5CF6',
  },
];

interface Subscription {
  id: string;
  plan: string;
  status: string;
  start_date: string;
  end_date: string;
  delivery_address: string;
  skipped_meals: { date: string; meal_type: string }[];
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await subscriptionAPI.getSubscription();
      setSubscription(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching subscription:', error);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (user?.address) {
      setAddress(user.address);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubscription();
  }, [fetchSubscription]);

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    setShowModal(true);
  };

  const confirmSubscription = async () => {
    if (!selectedPlan || !address) {
      Alert.alert('Error', 'Please enter your delivery address');
      return;
    }

    setIsSubmitting(true);
    try {
      await subscriptionAPI.createSubscription({
        plan: selectedPlan,
        delivery_address: address,
      });
      setShowModal(false);
      Alert.alert('Success', 'Subscription created successfully!');
      fetchSubscription();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>Choose your perfect meal plan</Text>
        </View>

        {/* Current Subscription */}
        {subscription && (
          <View style={styles.currentPlan}>
            <View style={styles.currentPlanHeader}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.currentPlanTitle}>Current Plan</Text>
            </View>
            <View style={styles.currentPlanDetails}>
              <Text style={styles.currentPlanName}>{subscription.plan}</Text>
              <View style={[styles.statusBadge, subscription.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{subscription.status}</Text>
              </View>
            </View>
            <View style={styles.planDates}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Start Date:</Text>
                <Text style={styles.dateValue}>{formatDate(subscription.start_date)}</Text>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>End Date:</Text>
                <Text style={styles.dateValue}>{formatDate(subscription.end_date)}</Text>
              </View>
            </View>
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.addressText}>{subscription.delivery_address}</Text>
            </View>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>
            {subscription ? 'Change Plan' : 'Available Plans'}
          </Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                plan.popular && styles.planCardPopular,
                subscription?.plan.toLowerCase() === plan.id && styles.planCardCurrent,
              ]}
              onPress={() => handleSubscribe(plan.id)}
              disabled={subscription?.plan.toLowerCase() === plan.id}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: `${plan.color}15` }]}>
                  <Ionicons name={plan.icon as any} size={24} color={plan.color} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceAmount}>₹{plan.price}</Text>
                  <Text style={styles.priceUnit}>/week</Text>
                </View>
              </View>
              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color={plan.color} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              {subscription?.plan.toLowerCase() !== plan.id && (
                <View style={[styles.selectButton, { backgroundColor: plan.color }]}>
                  <Text style={styles.selectButtonText}>
                    {subscription ? 'Switch to ' : 'Select '}{plan.name}
                  </Text>
                </View>
              )}
              {subscription?.plan.toLowerCase() === plan.id && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current Plan</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Address Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Subscription</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {PLANS.find(p => p.id === selectedPlan)?.name} Plan - ₹{PLANS.find(p => p.id === selectedPlan)?.price}/week
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Delivery Address</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="Enter your delivery address"
                placeholderTextColor={COLORS.textLight}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
              onPress={confirmSubscription}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Subscription</Text>
              )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
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
  currentPlan: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  currentPlanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  currentPlanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  planDates: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planCardPopular: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  planCardCurrent: {
    opacity: 0.7,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  planDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceUnit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  currentBadge: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.border,
  },
  currentBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  addressInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
