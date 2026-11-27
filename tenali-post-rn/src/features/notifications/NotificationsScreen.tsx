import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { useNotifications } from '../../providers/NotificationContext';
import { useAuth } from '../../providers/AuthContext';

export const NotificationsScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const {
    announcements,
    isLoading,
    unreadCount,
    loadAnnouncements,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    loadAnnouncements(user?.id, isAdmin);
  }, [user?.id, isAdmin]);

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar
        title="Announcements"
        showBack
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => markAllAsRead(user?.id)}
              style={styles.markAllBtn}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primaryNavy} />
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color={AppColors.textMuted} />
              <Text style={styles.emptyText}>No announcements yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                AppStyles.card,
                styles.card,
                !item.isRead && styles.unreadCard,
              ]}
              onPress={() => markAsRead(item.id, user?.id)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name={item.isRead ? 'mail-open-outline' : 'megaphone'}
                    size={20}
                    color={item.isRead ? AppColors.textSecondary : AppColors.secondaryMaroon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.date}>
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </Text>
                </View>
                {!item.isRead && <View style={styles.dot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  list: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 8 },
  unreadCard: { borderColor: AppColors.goldBorder, backgroundColor: '#FFFBEB' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  date: { fontSize: 11, color: AppColors.textMuted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.secondaryMaroon },
  message: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 19 },
  emptyText: { fontSize: 14, color: AppColors.textMuted },
  markAllBtn: {
    backgroundColor: AppColors.surfaceCream,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: AppColors.primaryNavy },
});
