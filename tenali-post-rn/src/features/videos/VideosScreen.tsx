import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { AppConstants } from '../../core/constants';
import { DataService } from '../../services/dataService';
import { VideoLesson } from '../../models';

export const VideosScreen: React.FC = () => {
  const [selectedExamId, setSelectedExamId] = useState('mts');
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const list = await DataService.getVideos(selectedExamId);
      if (active) {
        setVideos(list);
        setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [selectedExamId]);

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
          data={videos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="videocam-outline" size={52} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>No Video Lessons Yet</Text>
              <Text style={styles.emptySub}>
                Departmental class recordings added by Admin will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[AppStyles.card, styles.card]}
              onPress={() => {
                if (item.videoUrl) Linking.openURL(item.videoUrl).catch(() => {});
              }}
            >
              <View style={styles.playBox}>
                <Ionicons name="play" size={26} color={AppColors.surfaceWhite} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.meta}>
                  {item.duration} • {item.languageCode.toUpperCase()}
                </Text>
              </View>
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
  playBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: AppColors.secondaryMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  desc: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '700', color: AppColors.infoBlue, marginTop: 4 },
});
