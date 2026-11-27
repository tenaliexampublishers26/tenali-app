import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { AppConstants } from '../../core/constants';
import { DataSync } from '../../core/utils/dataSync';
import { DataService } from '../../services/dataService';
import { StudyNote } from '../../models';
import { useLmsAdmin } from '../../providers/LmsAdminContext';

export const NotesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { notes: lmsNotes, loadOverview } = useLmsAdmin();
  const [selectedExamId, setSelectedExamId] = useState('mts');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [list] = await Promise.all([
        DataService.getNotes(selectedExamId),
        loadOverview(),
      ]);
      setNotes(list);
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useEffect(() => {
    return DataSync.subscribe((topic) => {
      if (topic === 'all' || topic === 'notes') {
        loadAll();
      }
    });
  }, [loadAll]);

  const combinedNotes: StudyNote[] = [
    ...notes,
    ...lmsNotes.map((m) => ({
      id: m.id,
      examId: selectedExamId,
      title: m.title,
      description: m.description || 'Protected Study Material',
      fileUrl: m.pdfUrl,
      fileSize: m.fileSize,
      pageCount: m.pagesCount,
      languageCode: 'en',
      isFree: m.isFree,
    })),
  ];

  return (
    <View style={AppStyles.screenContainer}>
      <View style={styles.filterRow}>
        {AppConstants.exams.slice(0, 4).map((ex) => {
          const active = selectedExamId === ex.id;
          return (
            <TouchableOpacity
              key={ex.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedExamId(ex.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {ex.code}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primaryNavy} />
        </View>
      ) : (
        <FlatList
          data={combinedNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={52} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>No Study Notes Available</Text>
              <Text style={styles.emptySub}>
                Protected PDF guides uploaded by Admin will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[AppStyles.card, styles.card]}
              onPress={() => navigation.navigate('ProtectedPdfViewer', { note: item })}
            >
              <View style={styles.pdfIcon}>
                <Ionicons name="document-lock" size={24} color={AppColors.secondaryMaroon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.meta}>
                  {item.fileSize || 'PDF'} • {item.pageCount} Pages • Protected View
                </Text>
              </View>
              <Ionicons name="eye-outline" size={22} color={AppColors.primaryNavy} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  emptySub: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: AppColors.surfaceWarmWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceCream,
  },
  chipActive: { backgroundColor: AppColors.primaryNavy },
  chipText: { fontSize: 12, fontWeight: '800', color: AppColors.textSecondary },
  chipTextActive: { color: AppColors.surfaceWhite },
  list: { padding: 16, gap: 12 },
  card: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pdfIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  desc: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '700', color: AppColors.successGreen, marginTop: 4 },
});
