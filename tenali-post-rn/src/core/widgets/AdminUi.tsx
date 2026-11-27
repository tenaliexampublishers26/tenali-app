import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../theme';

export const AdminStatCard: React.FC<{
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
}> = ({ title, value, icon, color = AppColors.primaryNavy, onPress }) => {
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.statCard} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Container>
  );
};

export const AdminSectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, subtitle, actionLabel, onAction }) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const StatusBadge: React.FC<{
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}> = ({ label, variant = 'neutral' }) => {
  const palette = {
    success: { bg: AppColors.successGreenBg, text: AppColors.successGreen },
    warning: { bg: '#FEF3C7', text: '#B45309' },
    error: { bg: AppColors.errorRedBg, text: AppColors.errorRed },
    info: { bg: '#E0F2FE', text: AppColors.infoBlue },
    neutral: { bg: AppColors.surfaceCream, text: AppColors.textSecondary },
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: AppColors.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: 14,
    gap: 6,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.primaryNavy,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.primaryNavy,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: AppColors.primaryNavy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    color: AppColors.surfaceWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
