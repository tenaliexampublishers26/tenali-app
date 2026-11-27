import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader } from '../../core/widgets/AdminUi';
import { useAdmin } from '../../providers/AdminContext';
import { useAuth } from '../../providers/AuthContext';

export const AdminContentScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    exams,
    videos,
    loadDashboardOverview,
    loadVideos,
    saveExam,
    deleteExam,
    saveVideo,
    deleteVideo,
  } = useAdmin();

  const [videoModal, setVideoModal] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [vExamId, setVExamId] = useState('mts');

  const [examModal, setExamModal] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eCode, setECode] = useState('');

  useEffect(() => {
    loadDashboardOverview();
    loadVideos();
  }, []);

  const adminEmail = user?.email || 'admin';

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Exams & Video Lessons" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminSectionHeader
          title="Exam Cadres"
          actionLabel="+ Exam"
          onAction={() => setExamModal(true)}
        />
        <View style={{ gap: 10 }}>
          {exams.map((ex) => (
            <View key={ex.id} style={[AppStyles.card, styles.row]}>
              <View style={styles.codeBox}>
                <Text style={styles.code}>{ex.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{ex.title}</Text>
                <Text style={styles.sub}>{ex.subtitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  deleteExam(ex.id, adminEmail).catch((e) =>
                    Alert.alert('Cannot Delete', e.message)
                  )
                }
              >
                <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <AdminSectionHeader
          title="Video Lessons"
          actionLabel="+ Video"
          onAction={() => setVideoModal(true)}
        />
        <View style={{ gap: 10 }}>
          {videos.map((v) => (
            <View key={v.id} style={[AppStyles.card, styles.row]}>
              <Ionicons name="play-circle" size={26} color={AppColors.secondaryMaroon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{v.title}</Text>
                <Text style={styles.sub}>
                  {v.examId.toUpperCase()} • {v.duration}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteVideo(v.id, adminEmail)}>
                <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
              </TouchableOpacity>
            </View>
          ))}
          {videos.length === 0 && <Text style={styles.empty}>No video lessons added yet.</Text>}
        </View>
      </ScrollView>

      <Modal visible={examModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Exam Cadre</Text>
            <TextInput style={AppStyles.input} placeholder="Exam Title" value={eTitle} onChangeText={setETitle} />
            <TextInput style={AppStyles.input} placeholder="Code (e.g. GDS)" value={eCode} onChangeText={setECode} />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setExamModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.navyButton}
                onPress={async () => {
                  if (!eTitle.trim() || !eCode.trim()) return;
                  await saveExam(
                    {
                      id: eCode.toLowerCase().trim(),
                      title: eTitle.trim(),
                      subtitle: `${eTitle.trim()} Departmental Exam`,
                      code: eCode.toUpperCase().trim(),
                      totalChapters: 0,
                      totalQuestions: 0,
                      iconName: 'school',
                    },
                    adminEmail
                  );
                  setETitle('');
                  setECode('');
                  setExamModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={videoModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Video Lesson</Text>
            <TextInput style={AppStyles.input} placeholder="Video Title" value={vTitle} onChangeText={setVTitle} />
            <TextInput style={AppStyles.input} placeholder="Exam ID (mts, postman, pasa)" value={vExamId} onChangeText={setVExamId} />
            <TextInput style={AppStyles.input} placeholder="Video URL (YouTube / MP4)" value={vUrl} onChangeText={setVUrl} />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setVideoModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.primaryButton}
                onPress={async () => {
                  if (!vTitle.trim() || !vUrl.trim()) return;
                  await saveVideo(
                    {
                      id: `vid-${Date.now()}`,
                      examId: vExamId.trim() || 'mts',
                      title: vTitle.trim(),
                      description: 'Departmental video class',
                      videoUrl: vUrl.trim(),
                      duration: '18:00',
                      languageCode: 'te',
                      isFree: true,
                    },
                    adminEmail
                  );
                  setVTitle('');
                  setVUrl('');
                  setVideoModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  row: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { color: AppColors.goldGradientEnd, fontSize: 12, fontWeight: '800' },
  title: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  sub: { fontSize: 12, color: AppColors.textSecondary },
  empty: { textAlign: 'center', color: AppColors.textMuted, padding: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: AppColors.surfaceWhite, borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
