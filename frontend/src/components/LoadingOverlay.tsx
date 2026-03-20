import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import DabbaLogo from './DabbaLogo';

const COLORS = {
  maroon: '#8B1538',
  goldLight: '#F5E6C8',
  cream: '#FAF3E8',
  text: '#3D2914',
  textLight: '#8B7355',
};

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  showLogo?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  showLogo = true,
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.container}>
          {showLogo && (
            <View style={styles.logoContainer}>
              <DabbaLogo size={80} showText={false} />
            </View>
          )}
          <ActivityIndicator size="large" color={COLORS.maroon} style={styles.spinner} />
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(253, 248, 243, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    padding: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default LoadingOverlay;
