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
import { AdminSectionHeader, StatusBadge } from '../../core/widgets/AdminUi';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { LiveTestExporter } from '../../core/utils/liveTestExporter';
import { LmsLiveTest, LmsLiveTestSubmission } from '../../models/lms';

export const AdminLiveTestsScreen: React.FC = () => {
  const {
    liveTests,
    loadOverview,
    createLiveTest,
    updateLiveTest,
    deleteLiveTest,
    getLiveTestSubmissions,
  } = useLmsAdmin();

  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [resultsModal, setResultsModal] = useState(false);
  const [activeTest, setActiveTest] = useState<LmsLiveTest | null>(null);
  const [submissions, setSubmissions] = useState<LmsLiveTestSubmission[]>([]);

  useEffect(() => {
    loadOverview();
  }, []);

  const openResults = async (t: LmsLiveTest) => {
    setActiveTest(t);
    setSubmissions(await getLiveTestSubmissions(t.id));
    setResultsModal(true);
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Live Tests Console" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminSectionHeader
          title="Scheduled Live Tests"
          actionLabel="+ New Test"
          onAction={() => setCreateModal(true)}
        />

        <View style={{ gap: 12 }}>
          {liveTests.map((t) => (
            <View key={t.id} style={[AppStyles.card, styles.card]}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{t.title}</Text>
                <StatusBadge
                  label={t.status.toUpperCase()}
                  variant={
                    t.status === 'published'
                      ? 'success'
                      : t.status === 'closed'
                      ? 'error'
                      : 'warning'
                  }
                />
              </View>
              <Text style={styles.desc}>{t.description}</Text>
              <Text style={styles.meta}>
                {t.questionCount} Questions • {t.attemptsCount} Attempts • Answers:{' '}
                {t.answersReleased ? 'Released' : 'Hidden'}
              </Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() =>
                    updateLiveTest({
                      ...t,
                      status: t.status === 'published' ? 'closed' : 'published',
                    })
                  }
                >
                  <Text style={styles.smallBtnText}>
                    {t.status === 'published' ? 'Close Test' : 'Publish'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() =>
                    updateLiveTest({ ...t, answersReleased: !t.answersReleased })
                  }
                >
                  <Text style={styles.smallBtnText}>
                    {t.answersReleased ? 'Hide Keys' : 'Release Keys'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: AppColors.primaryNavy }]}
                  onPress={() => openResults(t)}
                >
                  <Text style={[styles.smallBtnText, { color: '#fff' }]}>Results</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Delete Test?', t.title, [
                      { text: 'Cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteLiveTest(t.id),
                      },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create Live Test Modal */}
      <Modal visible={createModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Live Mock Test</Text>
            <TextInput
              style={AppStyles.input}
              placeholder="Test Title"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[AppStyles.input, { minHeight: 70 }]}
              placeholder="Description"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setCreateModal(false)}
                style={AppStyles.outlinedButton}
              >
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.primaryButton}
                onPress={async () => {
                  if (!title.trim()) return;
                  await createLiveTest({
                    title,
                    description,
                    testDate: new Date().toISOString(),
                    status: 'published',
                  });
                  setTitle('');
                  setDescription('');
                  setCreateModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Results & Export Modal */}
      <Modal visible={resultsModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Ranked Results ({submissions.length})</Text>
              <TouchableOpacity onPress={() => setResultsModal(false)}>
                <Ionicons name="close" size={24} color={AppColors.primaryNavy} />
              </TouchableOpacity>
            </View>

            {activeTest && (
              <View style={styles.exportRow}>
                <TouchableOpacity
                  style={[AppStyles.navyButton, { flex: 1 }]}
                  onPress={() => LiveTestExporter.shareExcel(activeTest, submissions)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    Export Excel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[AppStyles.primaryButton, { flex: 1 }]}
                  onPress={() => LiveTestExporter.shareOrPrintPdf(activeTest, submissions)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    Export PDF
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={{ marginTop: 8 }}>
              {submissions.map((s) => (
                <View key={s.id} style={styles.subRow}>
                  <Text style={styles.rankBadge}>#{s.rank}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subName}>{s.studentName}</Text>
                    <Text style={styles.subMeta}>
                      {s.phoneNumber} • {s.location}
                    </Text>
                  </View>
                  <Text style={styles.subScore}>{s.percentage.toFixed(1)}%</Text>
                </View>
              ))}
              {submissions.length === 0 && (
                <Text style={styles.empty}>No submissions yet.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  card: { padding: 14, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  desc: { fontSize: 12, color: AppColors.textSecondary },
  meta: { fontSize: 11, fontWeight: '700', color: AppColors.textMuted },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  smallBtn: {
    backgroundColor: AppColors.surfaceCream,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: { fontSize: 12, fontWeight: '700', color: AppColors.primaryNavy },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: AppColors.surfaceWhite, borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  exportRow: { flexDirection: 'row', gap: 10 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  rankBadge: { fontSize: 14, fontWeight: '900', color: AppColors.secondaryMaroon, width: 32 },
  subName: { fontSize: 14, fontWeight: '700', color: AppColors.primaryNavy },
  subMeta: { fontSize: 11, color: AppColors.textSecondary },
  subScore: { fontSize: 14, fontWeight: '800', color: AppColors.successGreen },
  empty: { textAlign: 'center', color: AppColors.textMuted, padding: 20 },
});
