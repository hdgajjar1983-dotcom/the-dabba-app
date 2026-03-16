import React, { useState, useEffect, useCallback, useRef, Platform } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function ProfileScreen() {
  const { user, logout, refreshUser, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState(user?.address || '');
  const [planType, setPlanType] = useState(user?.plan_type || 'Standard Veg');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled ?? true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Register for push notifications
  useEffect(() => {
    registerForPushNotifications();

    // Notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (projectId) {
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        setPushToken(token);

        // Register token with backend
        if (user?.user_id) {
          await fetch(`${BACKEND_URL}/api/register-push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id, expo_push_token: token }),
          });
        }
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.user_id) return;

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.user_id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          plan_type: planType,
          notifications_enabled: notificationsEnabled,
        }),
      });

      if (res.ok) {
        await refreshUser();
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      // Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Delivery Reminder',
          body: 'Your tiffin will be delivered tomorrow at 12 PM!',
          data: { type: 'delivery_reminder' },
        },
        trigger: { seconds: 2 },
      });
      Alert.alert('Test Notification', 'You should receive a notification in 2 seconds');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const planOptions = ['Standard Veg', 'Premium Veg', 'Non-Veg', 'Jain'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.credits || 0}</Text>
          <Text style={styles.statLabel}>Meals Left</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.is_skipping_tomorrow ? 'Yes' : 'No'}</Text>
          <Text style={styles.statLabel}>Skipping</Text>
        </View>
      </View>

      {/* Profile Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="pencil" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Delivery Address</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="#9ca3af"
            />
          ) : (
            <Text style={styles.fieldValue}>{user?.address || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Meal Plan</Text>
          {editing ? (
            <View style={styles.planOptions}>
              {planOptions.map((plan) => (
                <TouchableOpacity
                  key={plan}
                  style={[styles.planOption, planType === plan && styles.planOptionSelected]}
                  onPress={() => setPlanType(plan)}
                >
                  <Text style={[styles.planOptionText, planType === plan && styles.planOptionTextSelected]}>
                    {plan}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>{user?.plan_type || 'Standard Veg'}</Text>
          )}
        </View>

        {editing && (
          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications-outline" size={20} color="#1b4332" />
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => {
              setNotificationsEnabled(value);
              if (!editing) setEditing(true);
            }}
            trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
            thumbColor={notificationsEnabled ? '#16a34a' : '#9ca3af'}
          />
        </View>

        <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
          <Ionicons name="notifications" size={18} color="#3b82f6" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        {pushToken && (
          <Text style={styles.tokenText}>Push token registered</Text>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>THE DABBA v2.0</Text>
        <Text style={styles.footerSubtext}>Halifax's Premium Tiffin Service</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 32 },

  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1b4332',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1b4332' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', color: '#1b4332' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: 16 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1b4332' },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' },
  fieldValue: { fontSize: 16, color: '#1f2937' },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },

  planOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planOptionSelected: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  planOptionText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  planOptionTextSelected: { color: '#16a34a' },

  editButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1b4332',
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { fontSize: 14, fontWeight: '500', color: '#374151' },

  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginTop: 12,
  },
  testButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  tokenText: { fontSize: 10, color: '#16a34a', textAlign: 'center', marginTop: 8 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 24,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },

  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12, fontWeight: '700', color: '#d1d5db', letterSpacing: 2 },
  footerSubtext: { fontSize: 10, color: '#e5e7eb', marginTop: 4 },
});
