import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader, StatusBadge } from '../../core/widgets/AdminUi';
import { useNotifications } from '../../providers/NotificationContext';
import { useAuth } from '../../providers/AuthContext';

export const AdminAnnouncementsScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    announcements,
    loadAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  } = useNotifications();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAnnouncements(user?.id, true);
  }, []);

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Manage Announcements" showBack />
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AdminSectionHeader
            title="Published & Draft Circulars"
            actionLabel="+ New Circular"
            onAction={() => setModalOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <View style={[AppStyles.card, styles.card]}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusBadge
                label={item.isPublished ? 'Published' : 'Draft'}
                variant={item.isPublished ? 'success' : 'warning'}
              />
            </View>
            <Text style={styles.msg}>{item.message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btn}
                onPress={() =>
                  updateAnnouncement({ id: item.id, isPublished: !item.isPublished })
                }
              >
                <Text style={styles.btnText}>
                  {item.isPublished ? 'Unpublish' : 'Publish'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete Circular?', item.title, [
                    { text: 'Cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteAnnouncement(item.id),
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TextInput
              style={AppStyles.input}
              placeholder="Announcement Title"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[AppStyles.input, { minHeight: 90 }]}
              placeholder="Message body..."
              multiline
              value={message}
              onChangeText={setMessage}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.primaryButton}
                onPress={async () => {
                  if (!title.trim() || !message.trim()) return;
                  await createAnnouncement({
                    title,
                    message,
                    isPublished: true,
                    createdBy: user?.id,
                  });
                  setTitle('');
                  setMessage('');
                  setModalOpen(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  msg: { fontSize: 13, color: AppColors.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  btn: { backgroundColor: AppColors.surfaceCream, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnText: { fontSize: 12, fontWeight: '700', color: AppColors.primaryNavy },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: AppColors.surfaceWhite, borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
