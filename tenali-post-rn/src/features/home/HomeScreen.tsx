import React, { useEffect } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { AppConstants } from '../../core/constants';
import { useAuth } from '../../providers/AuthContext';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { useNotifications } from '../../providers/NotificationContext';

interface Props {
  onSelectTab: (tab: string) => void;
}

export const HomeScreen: React.FC<Props> = ({ onSelectTab }) => {
  const navigation = useNavigation<any>();
  const { user, isAdmin } = useAuth();
  const { settings, loadPublicSettings } = useLmsAdmin();
  const { loadAnnouncements } = useNotifications();

  useEffect(() => {
    loadPublicSettings();
    loadAnnouncements(user?.id, isAdmin);
  }, []);

  if (settings.maintenanceMode && !isAdmin) {
    return (
      <View style={[AppStyles.screenContainer, styles.maintenance]}>
        <Ionicons name="construct-outline" size={56} color={AppColors.secondaryMaroon} />
        <Text style={styles.maintTitle}>Portal Under Maintenance</Text>
        <Text style={styles.maintSub}>
          We are upgrading Tenali Post with new departmental exam materials. Please check back shortly.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={AppStyles.screenContainer}
      contentContainerStyle={styles.scroll}
    >
      {/* Live Notification Ticker */}
      {settings.liveNotificationEnabled && settings.liveNotificationText.trim().length > 0 && (
        <TouchableOpacity
          style={styles.ticker}
          onPress={() => {
            if (settings.liveNotificationLink) {
              Linking.openURL(settings.liveNotificationLink).catch(() => {});
            }
          }}
        >
          <Ionicons name="megaphone" size={16} color={AppColors.surfaceWhite} />
          <Text style={styles.tickerText} numberOfLines={2}>
            {settings.liveNotificationText}
          </Text>
        </TouchableOpacity>
      )}

      {/* Gold Framed Welcome Card */}
      <LinearGradient
        colors={[AppColors.goldGradientStart, AppColors.goldGradientEnd]}
        style={styles.welcomeCard}
      >
        <View style={styles.welcomeTop}>
          <View style={styles.sessionChip}>
            <Text style={styles.sessionText}>SESSION 2026</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle-outline" size={28} color={AppColors.primaryNavy} />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeHello}>
          Welcome back, {user?.fullName?.split(' ')[0] || 'Aspirant'}!
        </Text>
        <Text style={styles.welcomeSub}>
          {user?.location || user?.postalCircle || 'India Post Departmental Exam Preparation'}
        </Text>
      </LinearGradient>

      {/* Live Test Banner */}
      {settings.liveTestEnabled && (
        <TouchableOpacity
          style={styles.liveBanner}
          onPress={() => onSelectTab('LiveTestsTab')}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE MOCK TESTS</Text>
            </View>
            <Text style={styles.liveTitle}>All-India Departmental Mock Tests</Text>
            <Text style={styles.liveSub}>
              Attempt timed & untimed tests and check your All-India Merit Rank.
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={34} color={AppColors.surfaceWhite} />
        </TouchableOpacity>
      )}

      {/* Quick Action Grid */}
      <Text style={styles.sectionHeading}>Study Modules</Text>
      <View style={styles.grid}>
        {settings.mcqEnabled && (
          <QuickModuleCard
            icon="checkmark-done-circle"
            title="MCQ Practice"
            subtitle="Chapter-wise & Bilingual"
            color={AppColors.primaryNavy}
            onPress={() => onSelectTab('McqTab')}
          />
        )}
        <QuickModuleCard
          icon="document-text"
          title="Study Notes"
          subtitle="Protected PDF Guides"
          color={AppColors.successGreen}
          onPress={() => onSelectTab('NotesTab')}
        />
        <QuickModuleCard
          icon="play-circle"
          title="Video Lessons"
          subtitle="Concept Classes"
          color={AppColors.infoBlue}
          onPress={() => onSelectTab('VideosTab')}
        />
        <QuickModuleCard
          icon="notifications"
          title="Announcements"
          subtitle="Exam Circulars"
          color={AppColors.goldBell}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      {/* Exam Categories Preview */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionHeading}>Postal Exam Cadres</Text>
        <TouchableOpacity onPress={() => onSelectTab('McqTab')}>
          <Text style={styles.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ gap: 10 }}>
        {AppConstants.exams.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[AppStyles.card, styles.examRow]}
            onPress={() => onSelectTab('McqTab')}
          >
            <View style={styles.examCodeBox}>
              <Text style={styles.examCode}>{ex.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.examTitle}>{ex.title}</Text>
              <Text style={styles.examSub}>{ex.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const QuickModuleCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, color, onPress }) => (
  <TouchableOpacity style={[AppStyles.card, styles.moduleCard]} onPress={onPress}>
    <View style={[styles.moduleIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.moduleTitle}>{title}</Text>
    <Text style={styles.moduleSub}>{subtitle}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  maintenance: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  maintTitle: { fontSize: 20, fontWeight: '800', color: AppColors.primaryNavy },
  maintSub: { fontSize: 14, color: AppColors.textSecondary, textAlign: 'center' },
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.primaryNavy,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tickerText: { flex: 1, color: AppColors.goldGradientStart, fontSize: 12, fontWeight: '700' },
  welcomeCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: AppColors.goldBorder,
  },
  welcomeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionChip: {
    backgroundColor: AppColors.goldChipBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sessionText: { fontSize: 10, fontWeight: '800', color: AppColors.primaryNavy },
  welcomeHello: { fontSize: 20, fontWeight: '800', color: AppColors.primaryNavy },
  welcomeSub: { fontSize: 13, color: AppColors.textSecondary, marginTop: 2 },
  liveBanner: {
    backgroundColor: AppColors.secondaryMaroon,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  livePillText: { color: AppColors.surfaceWhite, fontSize: 10, fontWeight: '800' },
  liveTitle: { color: AppColors.surfaceWhite, fontSize: 16, fontWeight: '800' },
  liveSub: { color: '#FEE2E2', fontSize: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: AppColors.primaryNavy },
  viewAll: { fontSize: 13, fontWeight: '700', color: AppColors.viewAllRed },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moduleCard: { width: '48%', padding: 14, gap: 6 },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  moduleSub: { fontSize: 12, color: AppColors.textSecondary },
  examRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  examCodeBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceCream,
    borderWidth: 1,
    borderColor: AppColors.borderWarmSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examCode: { fontSize: 12, fontWeight: '800', color: AppColors.primaryNavy },
  examTitle: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  examSub: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
});
