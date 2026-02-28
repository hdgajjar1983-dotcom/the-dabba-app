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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { driverAPI } from '../../src/services/api';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

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
  error: '#DC2626',
};

interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  meal_type: string;
  status: string;
  subscription_plan: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export default function DriverDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverLocation, setDriverLocation] = useState<LocationCoords | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Get driver's location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setDriverLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sort deliveries by distance from driver
  const sortByDistance = (deliveryList: Delivery[], driverLoc: LocationCoords): Delivery[] => {
    return deliveryList.map(delivery => {
      // Generate random coordinates near Mumbai for demo (in real app, use actual coordinates)
      const lat = delivery.latitude || (19.0760 + (Math.random() - 0.5) * 0.1);
      const lon = delivery.longitude || (72.8777 + (Math.random() - 0.5) * 0.1);
      const distance = calculateDistance(driverLoc.latitude, driverLoc.longitude, lat, lon);
      return { ...delivery, latitude: lat, longitude: lon, distance };
    }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  };

  const fetchDeliveries = useCallback(async () => {
    try {
      const response = await driverAPI.getDeliveries();
      let deliveryList = response.data.deliveries || [];
      
      // Filter only pending deliveries
      deliveryList = deliveryList.filter((d: Delivery) => d.status === 'pending');
      
      // Sort by distance if we have driver location
      if (driverLocation) {
        deliveryList = sortByDistance(deliveryList, driverLocation);
      }
      
      setDeliveries(deliveryList);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [driverLocation]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = (address: string, lat?: number, lon?: number) => {
    let url;
    if (lat && lon) {
      url = Platform.select({
        ios: `maps:?daddr=${lat},${lon}`,
        android: `google.navigation:q=${lat},${lon}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      });
    } else {
      const encodedAddress = encodeURIComponent(address);
      url = Platform.select({
        ios: `maps:?daddr=${encodedAddress}`,
        android: `google.navigation:q=${encodedAddress}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
      });
    }
    Linking.openURL(url);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take delivery photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setDeliveryPhoto(result.assets[0].uri);
      setShowPhotoModal(true);
    }
  };

  const sendWhatsAppPhoto = async (phone: string, photoUri: string) => {
    // Open WhatsApp with pre-filled message
    const message = encodeURIComponent('Your Dabba has been delivered! 🍱✅');
    const whatsappUrl = `whatsapp://send?phone=${phone.replace(/\D/g, '')}&text=${message}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        await Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`);
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
    }
  };

  const confirmDelivery = async () => {
    if (!deliveryPhoto) {
      Alert.alert('Photo Required', 'Please take a photo of the delivered meal');
      return;
    }

    const currentDelivery = deliveries[currentDeliveryIndex];
    if (!currentDelivery) return;

    setIsSubmitting(true);
    try {
      await driverAPI.updateDeliveryStatus(currentDelivery.id, 'delivered');
      
      // Send WhatsApp notification
      await sendWhatsAppPhoto(currentDelivery.customer_phone, deliveryPhoto);
      
      setCompletedCount(prev => prev + 1);
      setShowPhotoModal(false);
      setDeliveryPhoto(null);
      
      // Move to next delivery
      if (currentDeliveryIndex < deliveries.length - 1) {
        setCurrentDeliveryIndex(prev => prev + 1);
      } else {
        // Remove delivered item and refresh
        const newDeliveries = deliveries.filter((_, i) => i !== currentDeliveryIndex);
        setDeliveries(newDeliveries);
        setCurrentDeliveryIndex(0);
      }
      
      Alert.alert('Success', 'Delivery marked as completed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update delivery status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailed = async () => {
    const currentDelivery = deliveries[currentDeliveryIndex];
    if (!currentDelivery) return;

    Alert.alert(
      'Mark as Failed',
      'Are you sure you want to mark this delivery as failed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Failed',
          style: 'destructive',
          onPress: async () => {
            try {
              await driverAPI.updateDeliveryStatus(currentDelivery.id, 'failed');
              setFailedCount(prev => prev + 1);
              
              // Move to next delivery
              const newDeliveries = deliveries.filter((_, i) => i !== currentDeliveryIndex);
              setDeliveries(newDeliveries);
              if (currentDeliveryIndex >= newDeliveries.length) {
                setCurrentDeliveryIndex(Math.max(0, newDeliveries.length - 1));
              }
              
              Alert.alert('Updated', 'Delivery marked as failed');
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const currentDelivery = deliveries[currentDeliveryIndex];
  const totalDeliveries = deliveries.length + completedCount + failedCount;
  const remainingDeliveries = deliveries.length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Driver'}!</Text>
            <Text style={styles.subGreeting}>Today's delivery route</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressNumber}>{remainingDeliveries}</Text>
            <Text style={styles.progressLabel}>Left</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${totalDeliveries > 0 ? ((completedCount + failedCount) / totalDeliveries) * 100 : 0}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount + failedCount} of {totalDeliveries} completed
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
            <Text style={[styles.statNumber, { color: COLORS.error }]}>{failedCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>{remainingDeliveries}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Current Delivery */}
        {currentDelivery ? (
          <View style={styles.currentDeliverySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Delivery</Text>
              <View style={styles.deliveryNumber}>
                <Text style={styles.deliveryNumberText}>
                  #{currentDeliveryIndex + 1}
                </Text>
              </View>
            </View>

            <View style={styles.deliveryCard}>
              {/* Distance Badge */}
              {currentDelivery.distance && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={14} color={COLORS.primary} />
                  <Text style={styles.distanceText}>
                    {currentDelivery.distance.toFixed(1)} km away
                  </Text>
                </View>
              )}

              {/* Customer Info */}
              <View style={styles.customerSection}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={28} color={COLORS.white} />
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{currentDelivery.customer_name}</Text>
                  <View style={styles.planBadge}>
                    <Ionicons name="star" size={12} color={COLORS.primary} />
                    <Text style={styles.planText}>{currentDelivery.subscription_plan}</Text>
                  </View>
                </View>
                <View style={styles.mealBadge}>
                  <Ionicons name="moon" size={16} color={COLORS.primary} />
                  <Text style={styles.mealText}>{currentDelivery.meal_type}</Text>
                </View>
              </View>

              {/* Address */}
              <View style={styles.addressSection}>
                <View style={styles.addressIcon}>
                  <Ionicons name="location" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.addressText}>{currentDelivery.address}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={() => handleCall(currentDelivery.customer_phone)}
                >
                  <Ionicons name="call" size={22} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.navigateButton]}
                  onPress={() => handleNavigate(currentDelivery.address, currentDelivery.latitude, currentDelivery.longitude)}
                >
                  <Ionicons name="navigate" size={22} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>

              {/* Delivery Actions */}
              <View style={styles.deliveryActions}>
                <TouchableOpacity
                  style={styles.deliveredButton}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera" size={24} color={COLORS.white} />
                  <Text style={styles.deliveredButtonText}>Take Photo & Deliver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.failedButton}
                  onPress={handleFailed}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.white} />
                  <Text style={styles.failedButtonText}>Failed</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Upcoming Deliveries Preview */}
            {deliveries.length > 1 && (
              <View style={styles.upcomingSection}>
                <Text style={styles.upcomingTitle}>Next Up</Text>
                {deliveries.slice(currentDeliveryIndex + 1, currentDeliveryIndex + 3).map((delivery, index) => (
                  <View key={delivery.id} style={styles.upcomingCard}>
                    <View style={styles.upcomingNumber}>
                      <Text style={styles.upcomingNumberText}>#{currentDeliveryIndex + 2 + index}</Text>
                    </View>
                    <View style={styles.upcomingInfo}>
                      <Text style={styles.upcomingName}>{delivery.customer_name}</Text>
                      <Text style={styles.upcomingAddress} numberOfLines={1}>{delivery.address}</Text>
                    </View>
                    {delivery.distance && (
                      <Text style={styles.upcomingDistance}>{delivery.distance.toFixed(1)} km</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-done-circle" size={64} color={COLORS.success} />
            </View>
            <Text style={styles.emptyTitle}>All Done! 🎉</Text>
            <Text style={styles.emptyText}>You've completed all deliveries for today</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Today's Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivered:</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>{completedCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Failed:</Text>
                <Text style={[styles.summaryValue, { color: COLORS.error }]}>{failedCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total:</Text>
                <Text style={styles.summaryValue}>{completedCount + failedCount}</Text>
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
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {deliveryPhoto && (
              <Image source={{ uri: deliveryPhoto }} style={styles.photoPreview} />
            )}

            <Text style={styles.photoNote}>
              This photo will be sent to the customer via WhatsApp
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={takePhoto}
              >
                <Ionicons name="camera-reverse" size={20} color={COLORS.primary} />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
                onPress={confirmDelivery}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                    <Text style={styles.confirmButtonText}>Confirm & Send</Text>
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  progressBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressLabel: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  currentDeliverySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  deliveryNumber: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  planText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mealText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  addressSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addressIcon: {
    marginRight: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  callButton: {
    backgroundColor: '#3B82F6',
  },
  navigateButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  deliveryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deliveredButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  deliveredButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  failedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.error,
    paddingVertical: 16,
    borderRadius: 12,
  },
  failedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  upcomingSection: {
    marginTop: 24,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upcomingNumber: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  upcomingNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  upcomingAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  upcomingDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 16,
  },
  photoNote: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
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
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
