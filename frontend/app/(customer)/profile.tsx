import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { useAuth } from '../../src/context/AuthContext';
import { router } from 'expo-router';

const COLORS = {
  background: '#FDF8F3',
  card: '#FFFFFF',
  maroon: '#8B1538',
  gold: '#C9A050',
  goldLight: '#F5E6C8',
  cream: '#FAF3E8',
  text: '#2C1810',
  textLight: '#6B5B4F',
  border: '#E8DED3',
  success: '#3D7C47',
  error: '#C41E3A',
};

// Animated menu item
const AnimatedMenuItem = ({ icon, label, onPress, index, isLast }: any) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        entering={FadeInDown.delay(300 + index * 50).springify()}
        style={[
          styles.menuItem,
          isLast && styles.menuItemLast,
          animatedStyle,
        ]}
      >
        <View style={styles.menuItemLeft}>
          <View style={styles.menuIconContainer}>
            <Ionicons name={icon} size={20} color={COLORS.maroon} />
          </View>
          <Text style={styles.menuItemLabel}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// Quick link card
const QuickLinkCard = ({ icon, label, subtitle, onPress, color, bgColor, index }: any) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        entering={FadeInDown.delay(200 + index * 80).springify()}
        style={[styles.quickLinkCard, animatedStyle]}
      >
        <View style={[styles.quickLinkIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.quickLinkLabel}>{label}</Text>
        <Text style={styles.quickLinkSubtitle}>{subtitle}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logout();
          }
        },
      ]
    );
  };

  const quickLinks = [
    { icon: 'calendar-outline', label: 'Weekly Menu', subtitle: 'View full menu', onPress: () => router.push('/(customer)/menu'), color: '#E65100', bgColor: '#FFF3E0' },
    { icon: 'wallet-outline', label: 'Wallet', subtitle: 'Credits & balance', onPress: () => router.push('/(customer)/wallet'), color: '#2E7D32', bgColor: '#E8F5E9' },
    { icon: 'time-outline', label: 'History', subtitle: 'Past orders', onPress: () => router.push('/(customer)/history'), color: '#1565C0', bgColor: '#E3F2FD' },
  ];

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => {} },
    { icon: 'location-outline', label: 'Delivery Addresses', onPress: () => {} },
    { icon: 'card-outline', label: 'Payment Methods', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
  ];

  const supportItems = [
    { icon: 'chatbubble-ellipses-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'call-outline', label: 'Contact Us', onPress: () => {} },
    { icon: 'document-text-outline', label: 'Terms & Conditions', onPress: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </Animated.View>

        {/* User Info Card */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone && (
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.userPhone}>{user.phone}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="pencil" size={18} color={COLORS.gold} />
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Links - Menu, Wallet & Support */}
        <View style={styles.quickLinksContainer}>
          {quickLinks.map((item, index) => (
            <QuickLinkCard key={item.label} {...item} index={index} />
          ))}
        </View>

        {/* Account Settings */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <AnimatedMenuItem
                key={item.label}
                {...item}
                index={index}
                isLast={index === menuItems.length - 1}
              />
            ))}
          </View>
        </Animated.View>

        {/* Support */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuContainer}>
            {supportItems.map((item, index) => (
              <AnimatedMenuItem
                key={item.label}
                {...item}
                index={index + menuItems.length}
                isLast={index === supportItems.length - 1}
              />
            ))}
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Version */}
        <Animated.Text entering={FadeIn.delay(700)} style={styles.version}>
          Version 1.1.0
        </Animated.Text>
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
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.goldLight,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinksContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickLinkIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  quickLinkSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
  },
});
