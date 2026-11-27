import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '../core/theme';
import { AppConstants } from '../core/constants';
import { useNotifications } from '../providers/NotificationContext';

interface Props {
  title?: string;
  showBack?: boolean;
  onMenuPress?: () => void;
  rightAction?: React.ReactNode;
}

export const TenaliTopAppBar: React.FC<Props> = ({
  title,
  showBack = false,
  onMenuPress,
  rightAction,
}) => {
  const navigation = useNavigation<any>();
  const { unreadCount } = useNotifications();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <View style={styles.leftRow}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color={AppColors.primaryNavy} />
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="menu" size={26} color={AppColors.primaryNavy} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/images/tenali_post_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.title} numberOfLines={1}>
                {title || AppConstants.appName}
              </Text>
              {!title && (
                <Text style={styles.subtitle}>India Post Exam Prep</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rightRow}>
          {rightAction}
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.bellBtn}
            hitSlop={8}
          >
            <Ionicons name="notifications" size={22} color={AppColors.goldBell} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppColors.surfaceWarmWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderWarmSubtle,
  },
  bar: {
    height: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconBtn: {
    padding: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.primaryNavy,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AppColors.goldGradientStart,
    borderWidth: 1,
    borderColor: AppColors.goldInnerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.secondaryMaroon,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: AppColors.surfaceWhite,
    fontSize: 10,
    fontWeight: '800',
  },
});
