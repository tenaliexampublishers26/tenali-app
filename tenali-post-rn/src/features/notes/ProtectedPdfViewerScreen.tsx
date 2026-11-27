import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as ScreenCapture from 'expo-screen-capture';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { StudyNote } from '../../models';
import { useAuth } from '../../providers/AuthContext';

export const ProtectedPdfViewerScreen: React.FC = () => {
  const route = useRoute<any>();
  const note: StudyNote | undefined = route.params?.note;
  const { user } = useAuth();

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  const viewerUrl = note?.fileUrl
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(note.fileUrl)}`
    : null;

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title={note?.title || 'Protected PDF'} showBack />
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={14} color={AppColors.goldGradientEnd} />
        <Text style={styles.bannerText}>
          Protected View • Screenshots Disabled • {user?.email || 'Candidate'}
        </Text>
      </View>

      {viewerUrl ? (
        <WebView source={{ uri: viewerUrl }} style={{ flex: 1 }} startInLoadingState />
      ) : (
        <View style={styles.center}>
          <Ionicons name="document-lock-outline" size={56} color={AppColors.primaryNavy} />
          <Text style={styles.title}>{note?.title || 'Study Material'}</Text>
          <Text style={styles.desc}>{note?.description}</Text>
          <Text style={styles.note}>
            No remote PDF URL attached yet. Upload a PDF from the Admin Notes Console to view it here.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: AppColors.primaryNavy,
    paddingVertical: 6,
  },
  bannerText: { color: AppColors.goldGradientEnd, fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: AppColors.primaryNavy, textAlign: 'center' },
  desc: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center' },
  note: { fontSize: 12, color: AppColors.textMuted, textAlign: 'center', marginTop: 8 },
});
