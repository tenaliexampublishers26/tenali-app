import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { DataSync } from '../../core/utils/dataSync';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '../../core/utils/youtubeUtils';
import { DataService } from '../../services/dataService';
import { Exam, VideoFolder, VideoLesson } from '../../models';

const UNCATEGORIZED_FOLDER_ID = '__uncategorized__';

export const VideosScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('mts');
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [examList, folderList, videoList] = await Promise.all([
        DataService.getExams(),
        DataService.getVideoFolders(selectedExamId),
        DataService.getVideos(selectedExamId),
      ]);
      const cadreExams = examList.filter((e) => e.code !== 'TOPIC');
      setExams(cadreExams);
      setFolders(folderList);
      setVideos(videoList);
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    setSelectedFolderId(null);
    setSearchQuery('');
    loadData();
  }, [selectedExamId, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    return DataSync.subscribe((topic) => {
      if (topic === 'all' || topic === 'videos' || topic === 'exams') {
        loadData();
      }
    });
  }, [loadData]);

  const folderCards = useMemo(() => {
    const knownFolderIds = new Set(folders.map((f) => f.id));
    const cards = folders.map((folder) => ({
      folder,
      count: videos.filter((v) => v.folderId === folder.id).length,
    }));

    const uncategorizedCount = videos.filter(
      (v) => !v.folderId || !knownFolderIds.has(v.folderId)
    ).length;

    if (uncategorizedCount > 0) {
      cards.push({
        folder: {
          id: UNCATEGORIZED_FOLDER_ID,
          examId: selectedExamId,
          name: 'General Video Lessons',
          description: 'Videos not yet assigned to a specific topic folder',
          displayOrder: 9999,
        },
        count: uncategorizedCount,
      });
    }

    return cards;
  }, [folders, videos, selectedExamId]);

  const activeFolder = useMemo(
    () => folderCards.find((c) => c.folder.id === selectedFolderId)?.folder ?? null,
    [folderCards, selectedFolderId]
  );

  const activeFolderVideos = useMemo(() => {
    if (!selectedFolderId) return [];
    const knownFolderIds = new Set(folders.map((f) => f.id));
    const list =
      selectedFolderId === UNCATEGORIZED_FOLDER_ID
        ? videos.filter((v) => !v.folderId || !knownFolderIds.has(v.folderId))
        : videos.filter((v) => v.folderId === selectedFolderId);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    );
  }, [selectedFolderId, folders, videos, searchQuery]);

  const openVideo = (video: VideoLesson) => {
    navigation.navigate('VideoPlayer', {
      video,
      folderVideos: activeFolderVideos,
      folderName: activeFolder?.name || 'Video Lessons',
    });
  };

  return (
    <View style={AppStyles.screenContainer}>
      <View style={styles.filterRow}>
        {exams.slice(0, 6).map((ex) => {
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

      {selectedFolderId && activeFolder && (
        <View style={styles.breadcrumbBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setSelectedFolderId(null);
              setSearchQuery('');
            }}
          >
            <Ionicons name="arrow-back" size={18} color={AppColors.primaryNavy} />
            <Text style={styles.backText}>Topics</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
          <Text style={styles.breadcrumbTitle} numberOfLines={1}>
            {activeFolder.name}
          </Text>
        </View>
      )}

      {selectedFolderId && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={AppColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos in this topic..."
            placeholderTextColor={AppColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={AppColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primaryNavy} />
        </View>
      ) : !selectedFolderId ? (
        <FlatList
          data={folderCards}
          keyExtractor={(item) => item.folder.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="folder-open-outline" size={54} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>No Video Topic Folders Yet</Text>
              <Text style={styles.emptySub}>
                Create a Topic Folder and add YouTube videos or import a playlist from Admin → Exams & Videos.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[AppStyles.card, styles.folderCard]}
              onPress={() => setSelectedFolderId(item.folder.id)}
            >
              <View style={styles.folderIconBox}>
                <Ionicons name="folder" size={26} color={AppColors.goldGradientEnd} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.folder.name}</Text>
                {!!item.folder.description && (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.folder.description}
                  </Text>
                )}
                <Text style={styles.meta}>
                  {item.count} {item.count === 1 ? 'Video Lesson' : 'Video Lessons'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AppColors.primaryNavy} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={activeFolderVideos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="videocam-outline" size={52} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>No Videos in This Topic</Text>
              <Text style={styles.emptySub}>
                Add a YouTube link or import a YouTube playlist into "{activeFolder?.name}" from the Admin panel.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const videoId = extractYouTubeVideoId(item.videoUrl);
            const thumb = item.thumbnailUrl || (videoId ? getYouTubeThumbnailUrl(videoId) : null);

            return (
              <TouchableOpacity
                style={[AppStyles.card, styles.videoCard]}
                onPress={() => openVideo(item)}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.playBox]}>
                      <Ionicons name="play" size={24} color={AppColors.surfaceWhite} />
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <Ionicons name="play" size={16} color={AppColors.surfaceWhite} />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTag}>Lesson {index + 1}</Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {!!item.description && (
                    <Text style={styles.desc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.meta}>
                    {item.duration} • {item.languageCode.toUpperCase()} • Plays In-App
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy, textAlign: 'center' },
  emptySub: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 19 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: AppColors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: AppColors.surfaceCream,
  },
  backText: { fontSize: 12, fontWeight: '800', color: AppColors.primaryNavy },
  breadcrumbTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: AppColors.secondaryMaroon },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  searchInput: { flex: 1, fontSize: 13, color: AppColors.textPrimary },
  list: { padding: 16, gap: 12 },
  folderCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  folderIconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbWrap: {
    width: 112,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  playBox: {
    backgroundColor: AppColors.secondaryMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(142, 27, 27, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonTag: { fontSize: 10, fontWeight: '800', color: AppColors.secondaryMaroon },
  title: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  desc: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '700', color: AppColors.infoBlue, marginTop: 4 },
});
