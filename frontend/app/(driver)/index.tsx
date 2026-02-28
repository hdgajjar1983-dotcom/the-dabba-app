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
  Linking,
  Platform,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { driverAPI } from '../../src/services/api';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#FFF7ED',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  success: '#22C55E',
  successLight: '#DCFCE7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  border: '#E2E8F0',
  shadow: '#000',
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
  const [locationError, setLocationError] = useState<string | null>(null);

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }
      
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        // Use default location (Halifax) if location fails
        setDriverLocation({
          latitude: 44.6488,
          longitude: -63.5752,
        });
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
      Alert.alert('Permission Required', 'Please allow camera access to take delivery photos');
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

  const sendToWhatsApp = async (phone: string) => {
    const message = encodeURIComponent('✅ Your Dabba has been delivered! Thank you for choosing The Dabba. 🍱');
    const cleanPhone = phone.replace(/\D/g, '');
    
    try {
      await Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${message}`);
    } catch {
      // WhatsApp skipped as per user request
      console.log('WhatsApp not available');
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
      
      Alert.alert('Delivered! ✅', 'Great job! Moving to next delivery.');
    } catch (error) {
      Alert.alert('Error', 'Could not update delivery status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markFailed = async () => {
    if (!currentDelivery) return;

    Alert.alert(
      'Unable to Deliver?',
      'Please select a reason:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Customer Unavailable', 
          onPress: () => processFailure('Customer unavailable')
        },
        { 
          text: 'Wrong Address', 
          onPress: () => processFailure('Wrong address')
        },
        { 
          text: 'Other Issue', 
          onPress: () => processFailure('Other issue')
        },
      ]
    );
  };

  const processFailure = async (reason: string) => {
    try {
      await driverAPI.updateDeliveryStatus(currentDelivery!.id, 'failed');
      setFailedToday(prev => prev + 1);
      setPendingDeliveries(prev => prev.slice(1));
      Alert.alert('Marked as Failed', `Reason: ${reason}`);
    } catch (error) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
          <View>
            <Text style={styles.topBarGreeting}>Hi, {user?.name?.split(' ')[0] || 'Driver'}</Text>
            <Text style={styles.topBarSubtext}>Let's deliver happiness!</Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="bicycle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{pendingDeliveries.length}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.errorLight }]}>
              <Ionicons name="close" size={20} color={COLORS.error} />
            </View>
            <Text style={styles.statValue}>{failedToday}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {/* Current Delivery Card */}
        {currentDelivery && isOnline ? (
          <View style={styles.currentSection}>
            <View style={styles.currentHeader}>
              <View style={styles.currentBadge}>
                <Ionicons name="flash" size={14} color={COLORS.primary} />
                <Text style={styles.currentBadgeText}>CURRENT STOP</Text>
              </View>
              <Text style={styles.stopCounter}>
                {completedToday + failedToday + 1} of {allDeliveries.length}
              </Text>
            </View>

            <View style={styles.deliveryCard}>
              {/* ETA Banner */}
              <View style={styles.etaBanner}>
                <View style={styles.etaItem}>
                  <Ionicons name="navigate-circle" size={18} color={COLORS.white} />
                  <Text style={styles.etaText}>{currentDelivery.distance} km</Text>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaItem}>
                  <Ionicons name="time" size={18} color={COLORS.white} />
                  <Text style={styles.etaText}>{currentDelivery.estimated_time} min</Text>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={24} color={COLORS.white} />
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{currentDelivery.customer_name}</Text>
                  <View style={styles.orderInfo}>
                    <View style={styles.orderBadge}>
                      <Ionicons name="restaurant" size={12} color={COLORS.primary} />
                      <Text style={styles.orderBadgeText}>{currentDelivery.subscription_plan}</Text>
                    </View>
                    <View style={styles.mealBadge}>
                      <Ionicons name="moon" size={12} color={COLORS.purple} />
                      <Text style={styles.mealBadgeText}>{currentDelivery.meal_type}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.callBtn}
                  onPress={() => handleCall(currentDelivery.customer_phone)}
                >
                  <Ionicons name="call" size={20} color={COLORS.blue} />
                </TouchableOpacity>
              </View>

              {/* Address Card */}
              <TouchableOpacity 
                style={styles.addressCard}
                onPress={() => handleNavigate(currentDelivery.address)}
                activeOpacity={0.7}
              >
                <View style={styles.addressPin}>
                  <Ionicons name="location" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>DELIVERY ADDRESS</Text>
                  <Text style={styles.addressText}>{currentDelivery.address}</Text>
                </View>
                <View style={styles.addressArrow}>
                  <Ionicons name="arrow-forward-circle" size={28} color={COLORS.primary} />
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={styles.navigateBtn}
                  onPress={() => handleNavigate(currentDelivery.address)}
                >
                  <Ionicons name="navigate" size={22} color={COLORS.white} />
                  <Text style={styles.navigateBtnText}>Start Navigation</Text>
                </TouchableOpacity>
              </View>

              {/* Delivery Actions */}
              <View style={styles.deliveryActions}>
                <TouchableOpacity 
                  style={styles.deliverBtn}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={22} color={COLORS.white} />
                  <Text style={styles.deliverBtnText}>Photo & Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.failBtn}
                  onPress={markFailed}
                >
                  <Ionicons name="alert-circle" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Upcoming Deliveries */}
            {pendingDeliveries.length > 1 && (
              <View style={styles.upcomingSection}>
                <Text style={styles.upcomingTitle}>Coming Up Next</Text>
                {pendingDeliveries.slice(1, 4).map((delivery, index) => (
                  <View key={delivery.id} style={styles.upcomingItem}>
                    <View style={styles.upcomingNum}>
                      <Text style={styles.upcomingNumText}>{index + 2}</Text>
                    </View>
                    <View style={styles.upcomingDetails}>
                      <Text style={styles.upcomingName}>{delivery.customer_name}</Text>
                      <Text style={styles.upcomingAddr} numberOfLines={1}>{delivery.address}</Text>
                    </View>
                    <View style={styles.upcomingMeta}>
                      <Text style={styles.upcomingDist}>{delivery.distance} km</Text>
                    </View>
                  </View>
                ))}
                {pendingDeliveries.length > 4 && (
                  <Text style={styles.moreDeliveries}>
                    +{pendingDeliveries.length - 4} more deliveries
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : !isOnline ? (
          <View style={styles.offlineState}>
            <View style={styles.offlineIcon}>
              <Ionicons name="moon" size={48} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.offlineTitle}>You're Offline</Text>
            <Text style={styles.offlineText}>Go online to start receiving deliveries</Text>
            <TouchableOpacity 
              style={styles.goOnlineBtn}
              onPress={() => setIsOnline(true)}
            >
              <Text style={styles.goOnlineBtnText}>Go Online</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-done-circle" size={64} color={COLORS.success} />
            </View>
            <Text style={styles.emptyTitle}>All Done for Today! 🎉</Text>
            <Text style={styles.emptyText}>You've completed all your deliveries</Text>
            
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Today's Performance</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{completedToday}</Text>
                  <Text style={styles.summaryLabel}>Delivered</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{failedToday}</Text>
                  <Text style={styles.summaryLabel}>Failed</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                    {completedToday + failedToday > 0 
                      ? Math.round((completedToday / (completedToday + failedToday)) * 100) 
                      : 0}%
                  </Text>
                  <Text style={styles.summaryLabel}>Success</Text>
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
              <TouchableOpacity onPress={() => {
                setShowPhotoModal(false);
                setDeliveryPhoto(null);
              }}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {deliveryPhoto && (
              <View style={styles.photoContainer}>
                <Image source={{ uri: deliveryPhoto }} style={styles.photoPreview} />
                <View style={styles.photoOverlay}>
                  <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                </View>
              </View>
            )}

            <View style={styles.photoInfo}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.photoInfoText}>
                Photo proof will be saved with delivery record
              </Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
                <Ionicons name="camera-reverse" size={20} color={COLORS.primary} />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, isSubmitting && styles.btnDisabled]}
                onPress={confirmDelivery}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={COLORS.white} />
                    <Text style={styles.confirmBtnText}>Send & Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  topBarGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  topBarSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  onlineActive: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
  },
  onlineInactive: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.textSecondary,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    marginRight: 6,
  },
  onlineDotActive: {
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  onlineTextActive: {
    color: COLORS.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  currentSection: {
    marginBottom: 24,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  stopCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deliveryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  etaBanner: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 6,
  },
  etaDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderInfo: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mealBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.purple,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  addressPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
    lineHeight: 20,
  },
  addressArrow: {
    marginLeft: 8,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    borderRadius: 12,
  },
  navigateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  deliveryActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  deliverBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  deliverBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 8,
  },
  failBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingSection: {
    marginTop: 24,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  upcomingNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  upcomingDetails: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  upcomingAddr: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  upcomingMeta: {
    alignItems: 'flex-end',
  },
  upcomingDist: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  moreDeliveries: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  offlineState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  offlineIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  goOnlineBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  goOnlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  summaryBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  photoOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 4,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  photoInfoText: {
    fontSize: 13,
    color: COLORS.blue,
    marginLeft: 8,
    flex: 1,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  retakeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 6,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
