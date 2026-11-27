import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppColors } from '../../core/theme';
import { AppConstants } from '../../core/constants';
import { LogoHeader } from '../../shared/LogoHeader';
import { useAuth } from '../../providers/AuthContext';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { SupabaseService } from '../../services/supabaseService';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { restoreSession, isAuthenticated, needsProfileCompletion } = useAuth();
  const { loadPublicSettings } = useLmsAdmin();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await SupabaseService.initialize();
      await Promise.all([restoreSession(), loadPublicSettings()]);
      await new Promise((r) => setTimeout(r, 900));
      if (!mounted) return;

      if (isAuthenticated) {
        if (needsProfileCompletion) {
          navigation.reset({ index: 0, routes: [{ name: 'ProfileCompletion' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MainNav' }] });
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <LogoHeader size={92} showText darkText={false} />
        <Text style={styles.subtext}>{AppConstants.appSubtext}</Text>
      </View>
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={AppColors.goldBorder} />
        <Text style={styles.loadingText}>Initializing Tenali Post Portal...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryNavy,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtext: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: AppColors.goldGradientStart,
    fontSize: 12,
    fontWeight: '600',
  },
});
