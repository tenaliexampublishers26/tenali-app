import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { useAuth } from '../../providers/AuthContext';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isAdmin, updateProfile, signOut, isLoading } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [location, setLocation] = useState(user?.location ?? user?.postalCircle ?? '');

  const handleSave = async () => {
    const ok = await updateProfile(fullName, phone, location);
    if (ok) {
      Alert.alert('Saved', 'Your profile has been updated.');
    } else {
      Alert.alert('Error', 'Unable to update profile.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Candidate Profile" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[AppStyles.card, styles.headerCard]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.fullName || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.fullName || 'Candidate'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {isAdmin ? 'ADMINISTRATOR' : 'VERIFIED ASPIRANT'}
            </Text>
          </View>
        </View>

        <View style={[AppStyles.card, styles.formCard]}>
          <Text style={styles.sectionTitle}>Personal & Postal Details</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={AppStyles.input} value={fullName} onChangeText={setFullName} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={AppStyles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Postal Circle / Location</Text>
            <TextInput style={AppStyles.input} value={location} onChangeText={setLocation} />
          </View>

          <TouchableOpacity
            style={AppStyles.navyButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={AppColors.surfaceWhite} />
            ) : (
              <Text style={AppStyles.primaryButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[AppStyles.card, styles.adminBanner]}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <Ionicons name="shield-checkmark" size={24} color={AppColors.secondaryMaroon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.adminTitle}>Open Admin Management Console</Text>
              <Text style={styles.adminSub}>Manage MCQs, Live Tests, Notes & Students</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={AppColors.primaryNavy} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={AppColors.secondaryMaroon} />
          <Text style={styles.logoutText}>Sign Out of Tenali Post</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  headerCard: { padding: 20, alignItems: 'center', gap: 6 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: AppColors.goldGradientEnd },
  name: { fontSize: 19, fontWeight: '800', color: AppColors.primaryNavy, marginTop: 4 },
  email: { fontSize: 13, color: AppColors.textSecondary },
  badge: {
    marginTop: 4,
    backgroundColor: AppColors.goldGradientStart,
    borderWidth: 1,
    borderColor: AppColors.goldBorder,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: AppColors.primaryNavy },
  formCard: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: AppColors.primaryNavy },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
  adminBanner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderColor: AppColors.secondaryMaroon,
  },
  adminTitle: { fontSize: 15, fontWeight: '800', color: AppColors.secondaryMaroon },
  adminSub: { fontSize: 12, color: AppColors.textSecondary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: AppColors.secondaryMaroon },
});
