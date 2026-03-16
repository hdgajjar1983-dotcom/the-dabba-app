import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function LandingPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, router]);

  const features = [
    { icon: 'restaurant-outline', title: 'Home-Cooked Meals', desc: 'Authentic Indian cuisine daily' },
    { icon: 'time-outline', title: 'Flexible Plans', desc: 'Skip or pause anytime' },
    { icon: 'bicycle-outline', title: 'Fresh Delivery', desc: 'Hot meals at your door' },
    { icon: 'leaf-outline', title: 'Veg & Non-Veg', desc: 'Options for everyone' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="star" size={12} color="#ff9f1c" />
            <Text style={styles.badgeText}>Halifax's #1 Tiffin Service</Text>
          </View>
          
          <Text style={styles.brandName}>THE DABBA</Text>
          <Text style={styles.tagline}>Homemade Indian meals,{"\n"}delivered fresh daily</Text>
          
          <View style={styles.heroStats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Happy Customers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>18</Text>
              <Text style={styles.statLabel}>Credits to Start</Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          <View style={styles.featureGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color="#1b4332" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to start eating well?</Text>
          <Text style={styles.ctaSubtitle}>Sign up with Google and get 18 free meals to try!</Text>
          
          <TouchableOpacity style={styles.googleButton} onPress={login}>
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
          
          <Text style={styles.terms}>
            By signing up, you agree to our Terms of Service
          </Text>
        </View>

        {/* Pricing Preview */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Simple Pricing</Text>
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingLabel}>MOST POPULAR</Text>
            </View>
            <Text style={styles.pricingName}>Monthly Plan</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingPrice}>$399</Text>
              <Text style={styles.pricingPer}>/month</Text>
            </View>
            <Text style={styles.pricingCredits}>30 meals included</Text>
            <Text style={styles.pricingSavings}>Save $51 vs daily orders</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>POWERED BY THE DABBA CORE v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b4332',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero
  hero: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,159,28,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  badgeText: {
    color: '#ff9f1c',
    fontSize: 11,
    fontWeight: '700',
  },
  brandName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ff9f1c',
    letterSpacing: 6,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
  },

  // Features
  features: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1b4332',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#6b7280',
  },

  // CTA
  ctaSection: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1b4332',
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b4332',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  terms: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },

  // Pricing
  pricingSection: {
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#ff9f1c',
    alignItems: 'center',
  },
  pricingHeader: {
    backgroundColor: '#ff9f1c',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  pricingLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  pricingName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1b4332',
  },
  pricingPer: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  pricingCredits: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  pricingSavings: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 4,
  },

  // Footer
  footer: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d1d5db',
    letterSpacing: 3,
  },
});
