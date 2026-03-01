import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Image,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { driverAPI } from '../../src/services/api';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Uber Eats inspired dark theme
const COLORS = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  card: '#FFFFFF',
  primary: '#06C167', // Uber green
  primaryDark: '#05A656',
  text: '#FFFFFF',
  textDark: '#000000',
  textSecondary: '#8E8E93',
  textMuted: '#636366',
  success: '#06C167',
  error: '#FF3B30',
  warning: '#FF9500',
  border: '#3A3A3C',
  overlay: 'rgba(0,0,0,0.7)',
};

interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  meal_type: string;
  status: string;
  subscription_plan: string;
  distance: number;
  estimated_time: number;
  latitude?: number;
  longitude?: number;
}

export default function DriverDeliveries() {
  const { user } = useAuth();
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [deliveryPhotoBase64, setDeliveryPhotoBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [failedToday, setFailedToday] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);

  // Swipe animation
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = width * 0.4;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          swipeAnim.setValue(Math.min(gestureState.dx, width - 80));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.spring(swipeAnim, {
            toValue: width - 80,
            useNativeDriver: false,
          }).start(() => {
            takePhoto();
            swipeAnim.setValue(0);
          });
        } else {
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Request location permission
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setDriverLocation({ latitude: 44.6488, longitude: -63.5752 });
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        setDriverLocation({ latitude: 44.6488, longitude: -63.5752 });
      }
    })();
  }, []);

  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await driverAPI.getDeliveries(
        driverLocation?.latitude,
        driverLocation?.longitude
      );
      let deliveryList = response.data.deliveries || [];
      setAllDeliveries(deliveryList);
      setPendingDeliveries(deliveryList.filter((d: Delivery) => d.status === 'pending'));
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [driverLocation]);

  useEffect(() => {
    if (driverLocation) {
      fetchDeliveries();
    }
  }, [fetchDeliveries, driverLocation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries();
  }, [fetchDeliveries]);

  const currentDelivery = pendingDeliveries[0];

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:?daddr=${encodedAddress}`,
      android: `google.navigation:q=${encodedAddress}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
    });
    Linking.openURL(url);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access needed for delivery proof');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setDeliveryPhoto(result.assets[0].uri);
      setDeliveryPhotoBase64(result.assets[0].base64 || null);
      setShowPhotoModal(true);
    }
  };

  const confirmDelivery = async () => {
    if (!deliveryPhoto || !currentDelivery) return;

    setIsSubmitting(true);
    try {
      await driverAPI.updateDeliveryStatus(
        currentDelivery.id,
        'delivered',
        deliveryPhotoBase64 || undefined
      );
      setCompletedToday(prev => prev + 1);
      setPendingDeliveries(prev => prev.slice(1));
      setShowPhotoModal(false);
      setDeliveryPhoto(null);
      setDeliveryPhotoBase64(null);
    } catch (error) {
      Alert.alert('Error', 'Could not update delivery status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markFailed = () => {
    if (!currentDelivery) return;
    Alert.alert('Unable to Deliver?', 'Select a reason:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Customer Unavailable', onPress: () => processFailure('unavailable') },
      { text: 'Wrong Address', onPress: () => processFailure('wrong_address') },
      { text: 'Other', onPress: () => processFailure('other') },
    ]);
  };

  const processFailure = async (reason: string) => {
    try {
      await driverAPI.updateDeliveryStatus(currentDelivery!.id, 'failed');
      setFailedToday(prev => prev + 1);
      setPendingDeliveries(prev => prev.slice(1));
    } catch (error) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const swipeBackgroundColor = swipeAnim.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [COLORS.surfaceLight, COLORS.primary],
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding deliveries near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'Driver'}</Text>
              <Text style={styles.deliveryCount}>
                {pendingDeliveries.length} {pendingDeliveries.length === 1 ? 'delivery' : 'deliveries'} left
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.onlineToggle, isOnline ? styles.onlineActive : styles.onlineInactive]}
            onPress={() => setIsOnline(!isOnline)}
          >
            <View style={[styles.onlineDot, isOnline && styles.onlineDotActive]} />
            <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{failedToday}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {completedToday + failedToday > 0
                ? Math.round((completedToday / (completedToday + failedToday)) * 100)
                : 100}%
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentDelivery && isOnline ? (
          <>
            {/* Current Delivery Card */}
            <View style={styles.currentDeliveryCard}>
              <View style={styles.deliveryHeader}>
                <View style={styles.deliveryBadge}>
                  <Text style={styles.deliveryBadgeText}>CURRENT DELIVERY</Text>
                </View>
                <Text style={styles.deliveryProgress}>
                  {completedToday + failedToday + 1} of {allDeliveries.length}
                </Text>
              </View>

              {/* ETA Section */}
              <View style={styles.etaSection}>
                <View style={styles.etaItem}>
                  <Ionicons name="navigate" size={24} color={COLORS.primary} />
                  <Text style={styles.etaValue}>{currentDelivery.distance}</Text>
                  <Text style={styles.etaLabel}>km away</Text>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaItem}>
                  <Ionicons name="time" size={24} color={COLORS.primary} />
                  <Text style={styles.etaValue}>{currentDelivery.estimated_time}</Text>
                  <Text style={styles.etaLabel}>min ETA</Text>
                </View>
              </View>

              {/* Customer Section */}
              <View style={styles.customerSection}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={28} color={COLORS.textDark} />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{currentDelivery.customer_name}</Text>
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{currentDelivery.subscription_plan}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(currentDelivery.customer_phone)}
                >
                  <Ionicons name="call" size={22} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Address Section */}
              <TouchableOpacity
                style={styles.addressSection}
                onPress={() => handleNavigate(currentDelivery.address)}
              >
                <View style={styles.addressIcon}>
                  <Ionicons name="location" size={24} color={COLORS.card} />
                </View>
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>DELIVER TO</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {currentDelivery.address}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Navigation Button */}
              <TouchableOpacity
                style={styles.navigateButton}
                onPress={() => handleNavigate(currentDelivery.address)}
              >
                <Ionicons name="navigate" size={22} color={COLORS.card} />
                <Text style={styles.navigateButtonText}>Start Navigation</Text>
              </TouchableOpacity>

              {/* Swipe to Complete */}
              <View style={styles.swipeContainer}>
                <Animated.View
                  style={[styles.swipeBackground, { backgroundColor: swipeBackgroundColor }]}
                >
                  <Text style={styles.swipeHint}>Delivered!</Text>
                </Animated.View>
                <Animated.View
                  style={[styles.swipeButton, { transform: [{ translateX: swipeAnim }] }]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.swipeButtonInner}>
                    <Ionicons name="camera" size={28} color={COLORS.textDark} />
                  </View>
                </Animated.View>
                <Text style={styles.swipeText}>Swipe to complete delivery</Text>
              </View>

              {/* Unable to Deliver */}
              <TouchableOpacity style={styles.failButton} onPress={markFailed}>
                <Text style={styles.failButtonText}>Unable to deliver?</Text>
              </TouchableOpacity>
            </View>

            {/* Upcoming Deliveries */}
            {pendingDeliveries.length > 1 && (
              <View style={styles.upcomingSection}>
                <Text style={styles.upcomingTitle}>Coming Up</Text>
                {pendingDeliveries.slice(1, 4).map((delivery, index) => (
                  <View key={delivery.id} style={styles.upcomingCard}>
                    <View style={styles.upcomingNumber}>
                      <Text style={styles.upcomingNumberText}>{index + 2}</Text>
                    </View>
                    <View style={styles.upcomingInfo}>
                      <Text style={styles.upcomingName}>{delivery.customer_name}</Text>
                      <Text style={styles.upcomingAddress} numberOfLines={1}>
                        {delivery.address}
                      </Text>
                    </View>
                    <View style={styles.upcomingMeta}>
                      <Text style={styles.upcomingDistance}>{delivery.distance} km</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : !isOnline ? (
          <View style={styles.offlineState}>
            <View style={styles.offlineIcon}>
              <Ionicons name="moon" size={64} color={COLORS.textMuted} />
            </View>
            <Text style={styles.offlineTitle}>You're Offline</Text>
            <Text style={styles.offlineSubtitle}>Go online to start receiving deliveries</Text>
            <TouchableOpacity style={styles.goOnlineButton} onPress={() => setIsOnline(true)}>
              <Text style={styles.goOnlineButtonText}>Go Online</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>All Done!</Text>
            <Text style={styles.emptySubtitle}>You've completed all deliveries for today</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{completedToday}</Text>
                  <Text style={styles.summaryLabel}>Delivered</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{failedToday}</Text>
                  <Text style={styles.summaryLabel}>Failed</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Photo Confirmation Modal */}
      <Modal visible={showPhotoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Delivery</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPhotoModal(false);
                  setDeliveryPhoto(null);
                }}
              >
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {deliveryPhoto && (
              <Image source={{ uri: deliveryPhoto }} style={styles.photoPreview} />
            )}

            <View style={styles.photoNote}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              <Text style={styles.photoNoteText}>Photo proof will be saved</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.retakeButton} onPress={takePhoto}>
                <Ionicons name="camera-reverse" size={22} color={COLORS.text} />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
                onPress={confirmDelivery}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.textDark} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={22} color={COLORS.textDark} />
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  deliveryCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  onlineActive: {
    backgroundColor: 'rgba(6, 193, 103, 0.15)',
  },
  onlineInactive: {
    backgroundColor: COLORS.surfaceLight,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
    marginRight: 8,
  },
  onlineDotActive: {
    backgroundColor: COLORS.primary,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  onlineTextActive: {
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  currentDeliveryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deliveryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deliveryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: 0.5,
  },
  deliveryProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  etaSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  etaItem: {
    alignItems: 'center',
    flex: 1,
  },
  etaValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 8,
  },
  etaLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  etaDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  planBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 193, 103, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  addressIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContent: {
    flex: 1,
    marginLeft: 14,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 15,
    color: COLORS.textDark,
    lineHeight: 22,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  navigateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.card,
    marginLeft: 10,
  },
  swipeContainer: {
    height: 64,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  swipeBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    opacity: 0.8,
  },
  swipeButton: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    lineHeight: 64,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 70,
  },
  failButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  failButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
  upcomingSection: {
    marginTop: 8,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  upcomingNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 14,
  },
  upcomingName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  upcomingAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  upcomingMeta: {
    alignItems: 'flex-end',
  },
  upcomingDistance: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  offlineState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  offlineIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  offlineTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  goOnlineButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
  },
  goOnlineButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  photoPreview: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 16,
  },
  photoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 193, 103, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  photoNoteText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 10,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    paddingVertical: 16,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
