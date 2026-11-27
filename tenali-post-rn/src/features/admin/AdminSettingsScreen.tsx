import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader } from '../../core/widgets/AdminUi';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { SupabaseConnectionResult, SupabaseService } from '../../services/supabaseService';

export const AdminSettingsScreen: React.FC = () => {
  const { settings, updateSettings, loadOverview } = useLmsAdmin();

  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [mcqEnabled, setMcqEnabled] = useState(settings.mcqEnabled);
  const [liveTestEnabled, setLiveTestEnabled] = useState(settings.liveTestEnabled);
  const [tickerEnabled, setTickerEnabled] = useState(settings.liveNotificationEnabled);
  const [tickerText, setTickerText] = useState(settings.liveNotificationText);
  const [tickerLink, setTickerLink] = useState(settings.liveNotificationLink);

  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<SupabaseConnectionResult | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    setMaintenanceMode(settings.maintenanceMode);
    setMcqEnabled(settings.mcqEnabled);
    setLiveTestEnabled(settings.liveTestEnabled);
    setTickerEnabled(settings.liveNotificationEnabled);
    setTickerText(settings.liveNotificationText);
    setTickerLink(settings.liveNotificationLink);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings({
      maintenanceMode,
      mcqEnabled,
      liveTestEnabled,
      liveNotificationEnabled: tickerEnabled,
      liveNotificationText: tickerText,
      liveNotificationLink: tickerLink,
    });
    Alert.alert('Saved', 'Global LMS settings updated.');
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    const res = await SupabaseService.testConnection();
    setDbResult(res);
    setTestingDb(false);
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="LMS Settings" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminSectionHeader title="Feature Flags & Maintenance" />
        <View style={[AppStyles.card, styles.card]}>
          <ToggleRow label="Maintenance Mode" value={maintenanceMode} onChange={setMaintenanceMode} />
          <ToggleRow label="MCQ Practice Enabled" value={mcqEnabled} onChange={setMcqEnabled} />
          <ToggleRow label="Live Tests Enabled" value={liveTestEnabled} onChange={setLiveTestEnabled} />
        </View>

        <AdminSectionHeader title="Live Notification Ticker" />
        <View style={[AppStyles.card, styles.card]}>
          <ToggleRow label="Show Live Ticker Banner" value={tickerEnabled} onChange={setTickerEnabled} />
          <TextInput
            style={AppStyles.input}
            placeholder="Ticker announcement text"
            value={tickerText}
            onChangeText={setTickerText}
          />
          <TextInput
            style={AppStyles.input}
            placeholder="Optional link (https://...)"
            value={tickerLink}
            onChangeText={setTickerLink}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={AppStyles.primaryButton} onPress={handleSave}>
          <Text style={AppStyles.primaryButtonText}>Save LMS Settings</Text>
        </TouchableOpacity>

        <AdminSectionHeader title="Supabase Backend Diagnostics" />
        <View style={[AppStyles.card, styles.card]}>
          <TouchableOpacity style={AppStyles.navyButton} onPress={handleTestDb} disabled={testingDb}>
            {testingDb ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={AppStyles.primaryButtonText}>Test Supabase Connection</Text>
            )}
          </TouchableOpacity>
          {dbResult && (
            <View style={styles.diagBox}>
              <Text style={styles.diagStatus}>{dbResult.status}</Text>
              <Text style={styles.diagMsg}>{dbResult.message}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: AppColors.successGreen }} />
  </View>
);

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 14, gap: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: AppColors.primaryNavy },
  diagBox: {
    backgroundColor: AppColors.surfaceCream,
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  diagStatus: { fontSize: 13, fontWeight: '800', color: AppColors.primaryNavy },
  diagMsg: { fontSize: 12, color: AppColors.textSecondary },
});
