import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: '#FDF8F3',
  card: '#FFFFFF',
  maroon: '#8B1538',
  gold: '#C9A050',
  goldLight: '#F5E6C8',
  cream: '#FAF3E8',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  success: '#2E7D32',
};

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  enabled: boolean;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: 'delivery_updates',
    title: 'Delivery Updates',
    description: 'Get notified when your meal is on the way',
    icon: 'bicycle',
    iconColor: '#E65100',
    bgColor: '#FFF3E0',
    enabled: true,
  },
  {
    id: 'order_status',
    title: 'Order Status',
    description: 'Updates when your order is being prepared',
    icon: 'restaurant',
    iconColor: '#2E7D32',
    bgColor: '#E8F5E9',
    enabled: true,
  },
  {
    id: 'menu_updates',
    title: 'Menu Updates',
    description: 'Know when tomorrow\'s menu is ready',
    icon: 'calendar',
    iconColor: '#1565C0',
    bgColor: '#E3F2FD',
    enabled: true,
  },
  {
    id: 'promotions',
    title: 'Promotions & Offers',
    description: 'Special deals and discounts',
    icon: 'pricetag',
    iconColor: '#7B1FA2',
    bgColor: '#F3E5F5',
    enabled: false,
  },
  {
    id: 'reminders',
    title: 'Meal Reminders',
    description: 'Daily reminder before delivery',
    icon: 'alarm',
    iconColor: '#C41E3A',
    bgColor: '#FFEBEE',
    enabled: true,
  },
  {
    id: 'wallet_alerts',
    title: 'Wallet Alerts',
    description: 'Credits and transaction notifications',
    icon: 'wallet',
    iconColor: '#00838F',
    bgColor: '#E0F7FA',
    enabled: true,
  },
];

const NotificationItem = ({ 
  setting, 
  onToggle, 
  index 
}: { 
  setting: NotificationSetting; 
  onToggle: (id: string, value: boolean) => void;
  index: number;
}) => (
  <Animated.View 
    entering={FadeInDown.delay(100 + index * 50).springify()}
    style={styles.settingCard}
  >
    <View style={[styles.settingIcon, { backgroundColor: setting.bgColor }]}>
      <Ionicons name={setting.icon} size={22} color={setting.iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{setting.title}</Text>
      <Text style={styles.settingDescription}>{setting.description}</Text>
    </View>
    <Switch
      value={setting.enabled}
      onValueChange={(value) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(setting.id, value);
      }}
      trackColor={{ false: COLORS.border, true: COLORS.goldLight }}
      thumbColor={setting.enabled ? COLORS.maroon : '#f4f3f4'}
      ios_backgroundColor={COLORS.border}
    />
  </Animated.View>
);

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [refreshing, setRefreshing] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(defaultSettings.map(s => ({
          ...s,
          enabled: parsed[s.id] !== undefined ? parsed[s.id] : s.enabled
        })));
        setMasterEnabled(parsed.master !== false);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSetting[], master: boolean) => {
    try {
      const toSave: Record<string, boolean> = { master };
      newSettings.forEach(s => { toSave[s.id] = s.enabled; });
      await AsyncStorage.setItem('notification_settings', JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const handleToggle = (id: string, value: boolean) => {
    const newSettings = settings.map(s => 
      s.id === id ? { ...s, enabled: value } : s
    );
    setSettings(newSettings);
    saveSettings(newSettings, masterEnabled);
  };

  const handleMasterToggle = (value: boolean) => {
    setMasterEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!value) {
      const newSettings = settings.map(s => ({ ...s, enabled: false }));
      setSettings(newSettings);
      saveSettings(newSettings, false);
    } else {
      setSettings(defaultSettings);
      saveSettings(defaultSettings, true);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadSettings();
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.maroon} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </Animated.View>

        {/* Master Toggle */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.masterCard}>
          <View style={styles.masterContent}>
            <View style={[styles.masterIcon, { backgroundColor: masterEnabled ? '#E8F5E9' : '#F5F5F5' }]}>
              <Ionicons 
                name={masterEnabled ? 'notifications' : 'notifications-off'} 
                size={28} 
                color={masterEnabled ? COLORS.success : COLORS.textLight} 
              />
            </View>
            <View style={styles.masterText}>
              <Text style={styles.masterTitle}>
                {masterEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </Text>
              <Text style={styles.masterDescription}>
                {masterEnabled ? 'You\'ll receive updates about your meals' : 'Turn on to receive updates'}
              </Text>
            </View>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={handleMasterToggle}
            trackColor={{ false: COLORS.border, true: COLORS.goldLight }}
            thumbColor={masterEnabled ? COLORS.maroon : '#f4f3f4'}
            ios_backgroundColor={COLORS.border}
          />
        </Animated.View>

        {/* Settings List */}
        {masterEnabled && (
          <View style={styles.settingsList}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            {settings.map((setting, index) => (
              <NotificationItem
                key={setting.id}
                setting={setting}
                onToggle={handleToggle}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.infoText}>
            Push notifications require permission from your device settings.
          </Text>
        </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  masterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  masterText: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  masterDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  settingsList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
});
