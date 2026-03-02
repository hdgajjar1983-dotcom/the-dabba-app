import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import DabbaLogo, { BRAND_COLORS } from '../src/components/DabbaLogo';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  text: '#3D2914',
  textLight: '#8B7355',
};

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'kitchen' || user.role === 'admin') {
          router.replace('/(kitchen)');
        } else if (user.role === 'driver') {
          router.replace('/(driver)');
        } else {
          router.replace('/(customer)');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, user]);

  return (
    <View style={styles.container}>
      {/* Decorative top pattern */}
      <View style={styles.decorativePattern}>
        <View style={styles.patternLine} />
        <View style={styles.patternDot} />
        <View style={styles.patternLine} />
      </View>

      <View style={styles.logoContainer}>
        <DabbaLogo size={180} showText={false} />
        <Text style={styles.title}>The Dabba</Text>
        <Text style={styles.subtitle}>Gujarati Ghar Ka Swad</Text>
        <Text style={styles.tagline}>Traditional homestyle meals delivered</Text>
      </View>

      <ActivityIndicator size="large" color={COLORS.maroon} style={styles.loader} />

      {/* Decorative bottom pattern */}
      <View style={styles.decorativeBottom}>
        <Text style={styles.bottomText}>~ Since 2024 ~</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativePattern: {
    position: 'absolute',
    top: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  patternLine: {
    height: 1,
    width: 80,
    backgroundColor: COLORS.gold,
  },
  patternDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
    marginHorizontal: 16,
  },
  logoContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.maroon,
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.gold,
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
  loader: {
    marginTop: 40,
  },
  decorativeBottom: {
    position: 'absolute',
    bottom: 60,
  },
  bottomText: {
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    letterSpacing: 3,
  },
});
