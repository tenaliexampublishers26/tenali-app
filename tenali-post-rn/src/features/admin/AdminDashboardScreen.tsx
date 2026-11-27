import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader, AdminStatCard } from '../../core/widgets/AdminUi';
import { useAdmin } from '../../providers/AdminContext';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { useAuth } from '../../providers/AuthContext';

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isAdmin } = useAuth();
  const { stats, videos, videoFolders, loadDashboardOverview, loadVideos, loadVideoFolders } = useAdmin();
  const {
    settings,
    totalMcqQuestionsCount,
    activeLiveTestsCount,
    students,
    notes,
    isLoading,
    loadOverview,
    toggleMcqEnabled,
    toggleLiveTestEnabled,
  } = useLmsAdmin();

  useEffect(() => {
    loadDashboardOverview();
    loadOverview();
    loadVideoFolders();
    loadVideos();
  }, []);

  if (!isAdmin) {
    return (
      <View style={AppStyles.screenContainer}>
        <TenaliTopAppBar title="Access Denied" showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={52} color={AppColors.errorRed} />
          <Text style={styles.deniedTitle}>Administrator Access Required</Text>
          <Text style={styles.deniedSub}>
            Only the authorized Tenali Post administrator can access this console.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Admin Console" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading && (
          <ActivityIndicator size="small" color={AppColors.primaryNavy} style={{ marginBottom: 8 }} />
        )}

        <AdminSectionHeader
          title="Platform Overview"
          subtitle="Live metrics across Tenali Post LMS"
        />
        <View style={styles.statsGrid}>
          <AdminStatCard
            title="MCQ Questions"
            value={totalMcqQuestionsCount + (stats?.totalQuestions ?? 0)}
            icon="help-circle"
            color={AppColors.primaryNavy}
            onPress={() => navigation.navigate('AdminMcq')}
          />
          <AdminStatCard
            title="Live Tests"
            value={activeLiveTestsCount}
            icon="timer"
            color={AppColors.secondaryMaroon}
            onPress={() => navigation.navigate('AdminLiveTests')}
          />
          <AdminStatCard
            title="Study PDFs"
            value={notes.length}
            icon="document-text"
            color={AppColors.successGreen}
            onPress={() => navigation.navigate('AdminNotes')}
          />
          <AdminStatCard
            title="Video Lessons"
            value={videos.length}
            icon="logo-youtube"
            color={AppColors.secondaryMaroon}
            onPress={() => navigation.navigate('AdminVideos')}
          />
          <AdminStatCard
            title="Topic Folders"
            value={videoFolders.length}
            icon="folder"
            color={AppColors.goldBorder}
            onPress={() => navigation.navigate('AdminVideos')}
          />
          <AdminStatCard
            title="Students"
            value={students.length || stats?.totalStudents || 0}
            icon="people"
            color={AppColors.infoBlue}
            onPress={() => navigation.navigate('AdminStudents')}
          />
        </View>

        <AdminSectionHeader title="Quick Feature Controls" />
        <View style={[AppStyles.card, styles.toggleCard]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>MCQ Practice Module</Text>
              <Text style={styles.toggleSub}>Enable/disable student MCQ practice</Text>
            </View>
            <Switch
              value={settings.mcqEnabled}
              onValueChange={toggleMcqEnabled}
              trackColor={{ true: AppColors.successGreen }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Live Mock Tests Module</Text>
              <Text style={styles.toggleSub}>Enable/disable student live tests</Text>
            </View>
            <Switch
              value={settings.liveTestEnabled}
              onValueChange={toggleLiveTestEnabled}
              trackColor={{ true: AppColors.successGreen }}
            />
          </View>
        </View>

        <AdminSectionHeader title="Management Consoles" />
        <View style={{ gap: 10 }}>
          <AdminMenuRow
            icon="layers-outline"
            title="MCQ Bank & Bulk Importer"
            subtitle="Topics, chapters, CSV/JSON/Excel import"
            onPress={() => navigation.navigate('AdminMcq')}
          />
          <AdminMenuRow
            icon="timer-outline"
            title="Live Tests & Merit Exports"
            subtitle="Create tests, release answers, export Excel/PDF"
            onPress={() => navigation.navigate('AdminLiveTests')}
          />
          <AdminMenuRow
            icon="folder-open-outline"
            title="Study Notes & Protected PDFs"
            subtitle="Organize folders and upload PDF materials"
            onPress={() => navigation.navigate('AdminNotes')}
          />
          <AdminMenuRow
            icon="videocam-outline"
            title="Video Lessons & Topic Folders"
            subtitle="Create topic folders, add YouTube links & import playlists"
            onPress={() => navigation.navigate('AdminVideos')}
          />
          <AdminMenuRow
            icon="school-outline"
            title="Exams, Chapters & Videos"
            subtitle="Manage exam cadres, syllabus chapters & video lessons"
            onPress={() => navigation.navigate('AdminContent')}
          />
          <AdminMenuRow
            icon="megaphone-outline"
            title="Announcements & Circulars"
            subtitle="Publish notifications to all aspirants"
            onPress={() => navigation.navigate('AdminAnnouncements')}
          />
          <AdminMenuRow
            icon="people-outline"
            title="Student Directory"
            subtitle="View candidate profiles, attempts & account status"
            onPress={() => navigation.navigate('AdminStudents')}
          />
          <AdminMenuRow
            icon="settings-outline"
            title="LMS Settings & Supabase Check"
            subtitle="Maintenance mode, live ticker, DB diagnostics"
            onPress={() => navigation.navigate('AdminSettings')}
          />
          <AdminMenuRow
            icon="receipt-outline"
            title="Admin Audit Trail"
            subtitle="Track all administrative actions and timestamps"
            onPress={() => navigation.navigate('AdminAuditLog')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const AdminMenuRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={[AppStyles.card, styles.menuRow]} onPress={onPress}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={22} color={AppColors.primaryNavy} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSub}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  deniedTitle: { fontSize: 18, fontWeight: '800', color: AppColors.errorRed },
  deniedSub: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toggleCard: { padding: 14, gap: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: AppColors.primaryNavy },
  toggleSub: { fontSize: 12, color: AppColors.textSecondary },
  divider: { height: 1, backgroundColor: AppColors.borderSubtle },
  menuRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  menuSub: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
});
