import { StyleSheet } from 'react-native';

export const AppColors = {
  // Official Brand Colors
  primaryNavy: '#0B2545',
  primaryDark: '#07182C',
  secondaryMaroon: '#C81D25',
  secondaryMaroonLight: '#E53935',

  // Luxurious Gold Palette
  goldBorder: '#C89B3C',
  goldInnerBorder: '#DFBC69',
  goldGradientStart: '#FAF2DC',
  goldGradientEnd: '#F5E4B5',
  goldChipBg: '#DCA938',
  goldBell: '#D97706',

  // Aliases
  accentGold: '#C89B3C',
  accentGoldLight: '#FAF2DC',

  // Backgrounds & Warm Postal Paper Surfaces
  bgWarm: '#FAF7EE',
  surfaceWarmWhite: '#FFFDF8',
  surfaceCream: '#F4EFE6',
  borderWarmSubtle: '#EADBBE',

  bgLight: '#FAF7EE',
  surfaceWhite: '#FFFDF8',
  borderSubtle: '#EADBBE',

  // Text Colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Status & Feedback Colors
  successGreen: '#059669',
  successGreenBg: '#ECFDF5',
  errorRed: '#EF4444',
  errorRedBg: '#FEF2F2',
  warningAmber: '#F59E0B',
  infoBlue: '#0284C7',
  viewAllRed: '#B91C1C',
} as const;

export const AppStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: AppColors.bgWarm,
  },
  card: {
    backgroundColor: AppColors.surfaceWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: AppColors.primaryNavy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: AppColors.secondaryMaroon,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    color: AppColors.surfaceWhite,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  navyButton: {
    backgroundColor: AppColors.primaryNavy,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outlinedButton: {
    borderWidth: 1.5,
    borderColor: AppColors.primaryNavy,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outlinedButtonText: {
    color: AppColors.primaryNavy,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: AppColors.surfaceWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: AppColors.textPrimary,
  },
});
