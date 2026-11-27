import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../core/theme';
import { AppConstants } from '../core/constants';

interface Props {
  size?: number;
  showText?: boolean;
  darkText?: boolean;
}

export const LogoHeader: React.FC<Props> = ({
  size = 64,
  showText = true,
  darkText = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.logoBox, { width: size, height: size, borderRadius: size * 0.24 }]}>
        <Image
          source={require('../../assets/images/tenali_post_logo.png')}
          style={{ width: size * 0.85, height: size * 0.85 }}
          resizeMode="contain"
        />
      </View>
      {showText && (
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.title,
              { color: darkText ? AppColors.primaryNavy : AppColors.surfaceWhite },
            ]}
          >
            {AppConstants.appName}
          </Text>
          <Text
            style={[
              styles.tagline,
              { color: darkText ? AppColors.secondaryMaroon : AppColors.goldGradientEnd },
            ]}
          >
            {AppConstants.appTagline}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: AppColors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.goldBorder,
    shadowColor: AppColors.primaryNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.8,
  },
});
