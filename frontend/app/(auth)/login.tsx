import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/context/AuthContext';
import DabbaLogo, { BRAND_COLORS } from '../../src/components/DabbaLogo';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
  white: '#FFFFFF',
  error: '#C41E3A',
  inputBg: '#FFFFFF',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Button animation
  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    if (user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user.role === 'driver') {
        router.replace('/(driver)');
      } else if (user.role === 'kitchen') {
        router.replace('/(kitchen)');
      } else {
        router.replace('/(customer)');
      }
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please fill in all fields');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError('');

    const result = await login(email, password);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || 'Login failed');
      setIsLoading(false);
      // Shake animation for error
      buttonScale.value = withSequence(
        withTiming(0.95, { duration: 50 }),
        withTiming(1.05, { duration: 50 }),
        withTiming(0.95, { duration: 50 }),
        withTiming(1, { duration: 50 })
      );
    }
  };

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Decorative top pattern */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.decorativeTop}>
            <View style={styles.decorativeLine} />
            <View style={styles.decorativeDot} />
            <View style={styles.decorativeLine} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
            <DabbaLogo size={140} showText={false} />
            <Text style={styles.title}>The Dabba</Text>
            <Text style={styles.subtitle}>Gujarati Ghar Ka Swad</Text>
            <Text style={styles.tagline}>Traditional homestyle meals delivered</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.form}>
            {error ? (
              <Animated.View entering={FadeInDown.springify()} style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(450).springify()} style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword(!showPassword);
                  }} 
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            <TouchableOpacity
              activeOpacity={1}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Animated.View
                entering={FadeInUp.delay(550).springify()}
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled, buttonAnimStyle]}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.goldLight} />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </Animated.View>
            </TouchableOpacity>

            <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.registerContainer}>
              <Text style={styles.registerText}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </Animated.View>

          {/* Demo Credentials */}
          <Animated.View entering={FadeIn.delay(700)} style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Accounts</Text>
            <TouchableOpacity 
              style={styles.demoCredential}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEmail('customer@test.com');
                setPassword('test123');
              }}
            >
              <Ionicons name="person" size={16} color={COLORS.gold} />
              <Text style={styles.demoText}>Customer: customer@test.com</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.demoCredential}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEmail('kitchen2@dabba.com');
                setPassword('kitchen123');
              }}
            >
              <Ionicons name="restaurant" size={16} color={COLORS.gold} />
              <Text style={styles.demoText}>Kitchen: kitchen2@dabba.com</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.demoCredential}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEmail('driver2@dabba.com');
                setPassword('driver123');
              }}
            >
              <Ionicons name="bicycle" size={16} color={COLORS.gold} />
              <Text style={styles.demoText}>Driver: driver2@dabba.com</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Decorative bottom */}
          <Animated.View entering={FadeIn.delay(800)} style={styles.decorativeBottom}>
            <Text style={styles.decorativeText}>~ Since 2024 ~</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  decorativeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  decorativeLine: {
    height: 1,
    width: 60,
    backgroundColor: COLORS.gold,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    marginHorizontal: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.maroon,
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gold,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 6,
  },
  loginButton: {
    backgroundColor: COLORS.maroon,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.maroon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.goldLight,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  registerLink: {
    color: COLORS.maroon,
    fontSize: 14,
    fontWeight: '700',
  },
  demoContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoCredential: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.cream,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: COLORS.text,
  },
  decorativeBottom: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  decorativeText: {
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
});
