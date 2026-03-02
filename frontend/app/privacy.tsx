import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLORS } from '../src/components/DabbaLogo';

const COLORS = {
  ...BRAND_COLORS,
  background: '#FDF8F3',
  card: '#FFFFFF',
  text: '#3D2914',
  textLight: '#8B7355',
  border: '#E8DED1',
};

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last Updated: March 2025</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to The Dabba. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subTitle}>2.1 Personal Information</Text>
        <Text style={styles.paragraph}>
          • Account Information: Name, email, phone number, password{"\n"}
          • Delivery Information: Address, city, province, postal code{"\n"}
          • Payment Information: Processed securely through third-party processors{"\n"}
          • Communication: Messages and support requests
        </Text>

        <Text style={styles.subTitle}>2.2 Automatically Collected Information</Text>
        <Text style={styles.paragraph}>
          • Device Information: Device type, operating system{"\n"}
          • Location Data: GPS coordinates (with permission) for delivery optimization{"\n"}
          • Usage Data: App usage patterns and interaction data
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          • Process and deliver your meal orders{"\n"}
          • Manage your subscription and account{"\n"}
          • Send order confirmations and delivery updates{"\n"}
          • Process payments and refunds{"\n"}
          • Provide customer support{"\n"}
          • Improve our services
        </Text>

        <View style={styles.highlight}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.maroon} />
          <Text style={styles.highlightText}>
            We will never sell your personal information to third parties for marketing purposes.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>4. Information Sharing</Text>
        <Text style={styles.paragraph}>
          • Delivery Partners: Name, phone, address to complete deliveries{"\n"}
          • Payment Processors: Payment info for secure transactions{"\n"}
          • Service Providers: Third-party services that help operate our business{"\n"}
          • Legal Requirements: When required by law
        </Text>

        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures including encryption, secure authentication, regular audits, and access controls.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.paragraph}>
          • Access: Request a copy of your personal data{"\n"}
          • Correct: Update or correct inaccurate information{"\n"}
          • Delete: Request deletion of your account{"\n"}
          • Opt-out: Unsubscribe from marketing communications
        </Text>

        <Text style={styles.sectionTitle}>7. Contact Us</Text>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('mailto:privacy@thedabba.ca')}>
          <Ionicons name="mail" size={24} color={COLORS.maroon} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>privacy@thedabba.ca</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 The Dabba. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  updated: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.maroon,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F0',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.maroon,
    marginVertical: 16,
    gap: 12,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
    gap: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  contactValue: {
    fontSize: 15,
    color: COLORS.maroon,
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
