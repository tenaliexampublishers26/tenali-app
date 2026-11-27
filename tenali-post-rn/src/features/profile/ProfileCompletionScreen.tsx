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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, AppStyles } from '../../core/theme';
import { useAuth } from '../../providers/AuthContext';

export const ProfileCompletionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateProfile, isLoading } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [location, setLocation] = useState(user?.location ?? user?.postalCircle ?? '');

  const handleSave = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !location.trim()) {
      Alert.alert('Missing Details', 'Please fill in Full Name, Phone Number, and Postal Circle / Location.');
      return;
    }
    const ok = await updateProfile(fullName, phoneNumber, location);
    if (ok) {
      navigation.reset({ index: 0, routes: [{ name: 'MainNav' }] });
    } else {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={AppStyles.screenContainer}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Complete Your Candidate Profile</Text>
        <Text style={styles.subtext}>
          Required before accessing MCQ practice, Live Tests, and Merit Rankings.
        </Text>

        <View style={[AppStyles.card, styles.card]}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={AppStyles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[AppStyles.input, { backgroundColor: AppColors.surfaceCream }]}
              value={user?.email ?? ''}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={AppStyles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="10-digit mobile number"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Postal Circle / Division</Text>
            <TextInput
              style={AppStyles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Andhra Pradesh Circle / Tenali Division"
            />
          </View>

          <TouchableOpacity
            style={[AppStyles.primaryButton, { marginTop: 8 }]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={AppColors.surfaceWhite} />
            ) : (
              <Text style={AppStyles.primaryButtonText}>Save & Continue to Portal</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 14 },
  heading: { fontSize: 22, fontWeight: '800', color: AppColors.primaryNavy },
  subtext: { fontSize: 13, color: AppColors.textSecondary },
  card: { padding: 18, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: AppColors.primaryNavy },
});
