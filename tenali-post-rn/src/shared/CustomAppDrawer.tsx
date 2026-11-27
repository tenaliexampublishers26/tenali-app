import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '../core/theme';
import { AppConstants } from '../core/constants';
import { useAuth } from '../providers/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectTab?: (tabName: string) => void;
}

export const CustomAppDrawer: React.FC<Props> = ({
  visible,
  onClose,
  onSelectTab,
}) => {
  const navigation = useNavigation<any>();
  const { user, isAdmin, signOut } = useAuth();

  const handleNav = (screen: string, isTab = false) => {
    onClose();
    if (isTab && onSelectTab) {
      onSelectTab(screen);
    } else {
      navigation.navigate(screen);
    }
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.drawer}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.fullName || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.fullName || 'Candidate'}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email || 'Not signed in'}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {isAdmin ? 'ADMINISTRATOR' : 'POSTAL ASPIRANT'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={AppColors.surfaceWhite} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.menuList}>
            <DrawerItem
              icon="home-outline"
              label="Home Dashboard"
              onPress={() => handleNav('HomeTab', true)}
            />
            <DrawerItem
              icon="checkmark-circle-outline"
              label="MCQ Practice"
              onPress={() => handleNav('McqTab', true)}
            />
            <DrawerItem
              icon="timer-outline"
              label="Live Mock Tests"
              onPress={() => handleNav('LiveTestsTab', true)}
            />
            <DrawerItem
              icon="document-text-outline"
              label="Study Notes & PDFs"
              onPress={() => handleNav('NotesTab', true)}
            />
            <DrawerItem
              icon="play-circle-outline"
              label="Video Lessons"
              onPress={() => handleNav('VideosTab', true)}
            />
            <View style={styles.divider} />
            <DrawerItem
              icon="notifications-outline"
              label="Announcements"
              onPress={() => handleNav('Notifications')}
            />
            <DrawerItem
              icon="person-outline"
              label="My Profile"
              onPress={() => handleNav('Profile')}
            />

            {isAdmin && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
                <DrawerItem
                  icon="shield-checkmark-outline"
                  label="Admin Console"
                  highlight
                  onPress={() => handleNav('AdminDashboard')}
                />
                <DrawerItem
                  icon="megaphone-outline"
                  label="Manage Announcements"
                  onPress={() => handleNav('AdminAnnouncements')}
                />
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={AppColors.secondaryMaroon} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>{AppConstants.appName} v1.0.0 (RN)</Text>
          </View>
        </SafeAreaView>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      </View>
    </Modal>
  );
};

const DrawerItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  highlight?: boolean;
}> = ({ icon, label, onPress, highlight }) => (
  <TouchableOpacity
    style={[styles.menuItem, highlight && styles.menuItemHighlight]}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={22}
      color={highlight ? AppColors.secondaryMaroon : AppColors.primaryNavy}
    />
    <Text style={[styles.menuLabel, highlight && styles.menuLabelHighlight]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 24, 44, 0.5)',
  },
  drawer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: AppColors.surfaceWarmWhite,
    height: '100%',
  },
  backdrop: {
    flex: 1,
  },
  header: {
    backgroundColor: AppColors.primaryNavy,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.goldChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.primaryNavy,
  },
  name: {
    color: AppColors.surfaceWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(200, 155, 60, 0.25)',
    borderWidth: 1,
    borderColor: AppColors.goldBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    color: AppColors.goldGradientEnd,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  menuList: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 14,
  },
  menuItemHighlight: {
    backgroundColor: '#FEF2F2',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  menuLabelHighlight: {
    color: AppColors.secondaryMaroon,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderWarmSubtle,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: AppColors.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 6,
    letterSpacing: 0.8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderWarmSubtle,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.secondaryMaroon,
  },
  versionText: {
    fontSize: 11,
    color: AppColors.textMuted,
    marginTop: 6,
  },
});
