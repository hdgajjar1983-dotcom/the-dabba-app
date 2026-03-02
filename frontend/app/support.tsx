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
  success: '#2E7D32',
};

export default function Support() {
  const router = useRouter();

  const handleEmail = () => Linking.openURL('mailto:support@thedabba.ca');
  const handleCall = () => Linking.openURL('tel:+19025551234');
  const handleWhatsApp = () => Linking.openURL('https://wa.me/19025551234');

  const faqs = [
    {
      question: 'How do I subscribe to The Dabba?',
      answer: 'Download our app, create an account, and choose a subscription plan (Weekly or Monthly). Select your delivery address and you\'re all set!',
    },
    {
      question: 'Can I skip a meal?',
      answer: 'Yes! You can skip any meal through the app before the cutoff time (usually 10 AM). When you skip, you\'ll receive ₹120 credit in your wallet.',
    },
    {
      question: 'What are the delivery hours?',
      answer: 'Dinner is delivered between 7:00 PM - 8:30 PM daily. You\'ll receive a notification when your driver is on the way.',
    },
    {
      question: 'Are the meals vegetarian?',
      answer: 'Yes! All our meals are 100% vegetarian, prepared following traditional Gujarati recipes with fresh ingredients.',
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'Go to Profile → Manage Subscription → Cancel. Refunds for unused days will be credited to your wallet within 3-5 business days.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.maroon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>We're here to help!</Text>

        {/* Contact Options */}
        <View style={styles.contactGrid}>
          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.contactIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="mail" size={24} color="#1565C0" />
            </View>
            <Text style={styles.contactLabel}>Email Us</Text>
            <Text style={styles.contactValue}>support@thedabba.ca</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
            <View style={[styles.contactIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="call" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.contactLabel}>Call Us</Text>
            <Text style={styles.contactValue}>+1 (902) 555-1234</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
            <View style={[styles.contactIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactValue}>Message Us</Text>
          </TouchableOpacity>
        </View>

        {/* Support Hours */}
        <View style={styles.hoursCard}>
          <Ionicons name="time" size={24} color={COLORS.goldLight} />
          <View style={styles.hoursContent}>
            <Text style={styles.hoursTitle}>Support Hours</Text>
            <Text style={styles.hoursText}>Mon-Fri: 9 AM - 8 PM</Text>
            <Text style={styles.hoursText}>Sat: 10 AM - 6 PM</Text>
            <Text style={styles.hoursText}>Sun: 12 PM - 5 PM</Text>
          </View>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Text style={styles.faqAnswer}>{faq.answer}</Text>
          </View>
        ))}

        {/* Emergency */}
        <View style={styles.emergencyCard}>
          <Ionicons name="warning" size={24} color="#DC2626" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Urgent Issues?</Text>
            <Text style={styles.emergencyText}>
              For delivery emergencies or food safety concerns, call us immediately.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <TouchableOpacity style={styles.privacyLink} onPress={() => router.push('/privacy')}>
          <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.maroon} />
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
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  hoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
  },
  hoursContent: {
    flex: 1,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.goldLight,
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 13,
    color: '#F4E4BA',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.maroon,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  faqItem: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.maroon,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 20,
    gap: 14,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: '#7F1D1D',
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 4,
  },
  privacyLinkText: {
    fontSize: 14,
    color: COLORS.maroon,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
