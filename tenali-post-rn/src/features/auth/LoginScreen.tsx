import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, AppStyles } from '../../core/theme';
import { AppConstants } from '../../core/constants';
import { LogoHeader } from '../../shared/LogoHeader';
import { useAuth } from '../../providers/AuthContext';
import { isProfileComplete } from '../../models';
import { AuthService } from '../../services/authService';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { signInWithPassword, signUp, isLoading, errorMessage, clearError } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const navigateAfterAuth = () => {
    const current = AuthService.currentUser;
    if (current && !isProfileComplete(current)) {
      navigation.reset({ index: 0, routes: [{ name: 'ProfileCompletion' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'MainNav' }] });
    }
  };

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();

    if (isSignUp && !fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    const ok = isSignUp
      ? await signUp(fullName.trim(), email.trim(), password)
      : await signInWithPassword(email.trim(), password);

    if (ok) {
      navigateAfterAuth();
    }
  };

  const handleQuickLogin = async (presetEmail: string, presetPassword: string) => {
    setEmail(presetEmail);
    setPassword(presetPassword);
    setLocalError(null);
    clearError();
    const ok = await signInWithPassword(presetEmail, presetPassword);
    if (ok) navigateAfterAuth();
  };

  const displayedError = localError || errorMessage;

  return (
    <SafeAreaView style={AppStyles.screenContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <LogoHeader size={72} showText darkText />
            <Text style={styles.heroSubtitle}>
              India Post Departmental Exam Preparation Portal
            </Text>
          </View>

          <View style={[AppStyles.card, styles.formCard]}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, !isSignUp && styles.tabBtnActive]}
                onPress={() => {
                  setIsSignUp(false);
                  setLocalError(null);
                  clearError();
                }}
              >
                <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, isSignUp && styles.tabBtnActive]}
                onPress={() => {
                  setIsSignUp(true);
                  setLocalError(null);
                  clearError();
                }}
              >
                <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {displayedError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={AppColors.errorRed} />
                <Text style={styles.errorText}>{displayedError}</Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.field}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={AppStyles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={AppColors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={AppStyles.input}
                placeholder="name@example.com"
                placeholderTextColor={AppColors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[AppStyles.input, { flex: 1, borderWidth: 0 }]}
                  placeholder="Enter password"
                  placeholderTextColor={AppColors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={AppColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[AppStyles.primaryButton, { marginTop: 8 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={AppColors.surfaceWhite} />
              ) : (
                <Text style={AppStyles.primaryButtonText}>
                  {isSignUp ? 'Create Candidate Account' : 'Sign In to Portal'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[AppStyles.card, styles.demoCard]}>
            <Text style={styles.demoTitle}>Instant Demo Access</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[AppStyles.outlinedButton, { flex: 1 }]}
                onPress={() =>
                  handleQuickLogin(
                    AppConstants.exampleLoginEmail,
                    AppConstants.exampleLoginPassword
                  )
                }
                disabled={isLoading}
              >
                <Ionicons name="school-outline" size={16} color={AppColors.primaryNavy} />
                <Text style={[AppStyles.outlinedButtonText, { marginLeft: 6 }]}>
                  Student Demo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[AppStyles.navyButton, { flex: 1 }]}
                onPress={() =>
                  handleQuickLogin(
                    AppConstants.exampleAdminEmail,
                    AppConstants.exampleAdminPassword
                  )
                }
                disabled={isLoading}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={AppColors.surfaceWhite}
                />
                <Text
                  style={{
                    color: AppColors.surfaceWhite,
                    fontWeight: '700',
                    marginLeft: 6,
                    fontSize: 13,
                  }}
                >
                  Admin Demo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  heroSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  formCard: {
    padding: 18,
    gap: 14,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceCream,
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: AppColors.primaryNavy,
  },
  tabText: {
    fontWeight: '700',
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.surfaceWhite,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primaryNavy,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    borderRadius: 12,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.errorRedBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    color: AppColors.errorRed,
    fontSize: 12,
    fontWeight: '600',
  },
  demoCard: {
    padding: 16,
    gap: 10,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
