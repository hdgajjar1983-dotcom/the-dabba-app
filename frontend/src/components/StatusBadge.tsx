import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'active' | 'inactive';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  animated?: boolean;
}

const statusConfig = {
  success: {
    icon: 'checkmark-circle' as const,
    bgColor: '#E8F5E9',
    textColor: '#2E7D32',
    label: 'Success',
  },
  warning: {
    icon: 'warning' as const,
    bgColor: '#FFF3E0',
    textColor: '#E65100',
    label: 'Warning',
  },
  error: {
    icon: 'close-circle' as const,
    bgColor: '#FFEBEE',
    textColor: '#C41E3A',
    label: 'Error',
  },
  info: {
    icon: 'information-circle' as const,
    bgColor: '#E3F2FD',
    textColor: '#1565C0',
    label: 'Info',
  },
  pending: {
    icon: 'time' as const,
    bgColor: '#FFF3E0',
    textColor: '#E65100',
    label: 'Pending',
  },
  active: {
    icon: 'checkmark-circle' as const,
    bgColor: '#E8F5E9',
    textColor: '#2E7D32',
    label: 'Active',
  },
  inactive: {
    icon: 'pause-circle' as const,
    bgColor: '#F5F5F5',
    textColor: '#757575',
    label: 'Inactive',
  },
};

const sizeConfig = {
  small: { padding: 4, paddingH: 8, fontSize: 10, iconSize: 12 },
  medium: { padding: 6, paddingH: 10, fontSize: 12, iconSize: 14 },
  large: { padding: 8, paddingH: 14, fontSize: 14, iconSize: 16 },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'medium',
  showIcon = true,
  animated = true,
}) => {
  const config = statusConfig[status];
  const sizing = sizeConfig[size];
  const displayLabel = label || config.label;

  const BadgeContent = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingVertical: sizing.padding,
          paddingHorizontal: sizing.paddingH,
        },
      ]}
    >
      {showIcon && (
        <Ionicons name={config.icon} size={sizing.iconSize} color={config.textColor} />
      )}
      <Text
        style={[
          styles.label,
          {
            color: config.textColor,
            fontSize: sizing.fontSize,
          },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );

  if (animated) {
    return <Animated.View entering={FadeIn.duration(300)}>{BadgeContent}</Animated.View>;
  }

  return BadgeContent;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 4,
  },
  label: {
    fontWeight: '600',
  },
});

export default StatusBadge;
