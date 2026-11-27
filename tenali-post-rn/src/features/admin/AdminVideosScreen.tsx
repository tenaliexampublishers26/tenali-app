import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import {
  extractYouTubeVideoId,
  fetchYouTubeVideoTitle,
  getYouTubeThumbnailUrl,
  ImportedYouTubeVideo,
  importYouTubePlaylist,
  parseBulkYouTubeLinks,
} from '../../core/utils/youtubeUtils';
import { AdminSectionHeader } from '../../core/widgets/AdminUi';
import { VideoFolder, VideoLesson } from '../../models';
import { useAdmin } from '../../providers/AdminContext';
import { useAuth } from '../../providers/AuthContext';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';

const GENERAL_FOLDER_ID = '__general__';

export const AdminVideosScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    exams,
    videoFolders,
    videos,
    loadDashboardOverview,
    loadVideoFolders,
    loadVideos,
    saveVideoFolder,
    deleteVideoFolder,
    saveVideo,
    saveVideosBatch,
    deleteVideo,
  } = useAdmin();

  const [selectedExamId, setSelectedExamId] = useState('mts');
  // null = Folder List view; folderId or GENERAL_FOLDER_ID = Opened Folder view
  const [openedFolderId, setOpenedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Topic Folder modal
  const [folderModal, setFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<VideoFolder | null>(null);
  const [fExamId, setFExamId] = useState('mts');
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');

  // Create / Edit Video modal
  const [videoModal, setVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoLesson | null>(null);
  const [vExamId, setVExamId] = useState('mts');
  const [vFolderId, setVFolderId] = useState<string | null>(null);
  const [vTitle, setVTitle] = useState('');
  const [vDesc, setVDesc] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [vDuration, setVDuration] = useState('15:00');
  const [vLang, setVLang] = useState('te');
  const [vResolvingTitle, setVResolvingTitle] = useState(false);

  // Playlist / Bulk Import modal
  const [importModal, setImportModal] = useState(false);
  const [impExamId, setImpExamId] = useState('mts');
  const [impFolderId, setImpFolderId] = useState<string | null>(null);
  const [impNewFolderName, setImpNewFolderName] = useState('');
  const [impPlaylistUrl, setImpPlaylistUrl] = useState('');
  const [impApiKey, setImpApiKey] = useState('');
  const [impBulkLinks, setImpBulkLinks] = useState('');
  const [impLang, setImpLang] = useState('te');
  const [impFetching, setImpFetching] = useState(false);
  const [impWarning, setImpWarning] = useState<string | null>(null);
  const [impPreview, setImpPreview] = useState<ImportedYouTubeVideo[]>([]);
  const [impSelectedIds, setImpSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDashboardOverview();
    loadVideoFolders();
    loadVideos();
  }, []);

  const adminEmail = user?.email || 'admin';

  const examFolders = useMemo(
    () => videoFolders.filter((f) => f.examId === selectedExamId),
    [videoFolders, selectedExamId]
  );

  const examVideos = useMemo(
    () => videos.filter((v) => v.examId === selectedExamId),
    [videos, selectedExamId]
  );

  const generalVideosCount = useMemo(() => {
    const knownFolderIds = new Set(examFolders.map((f) => f.id));
    return examVideos.filter((v) => !v.folderId || !knownFolderIds.has(v.folderId)).length;
  }, [examFolders, examVideos]);

  const openedFolder = useMemo(() => {
    if (!openedFolderId || openedFolderId === GENERAL_FOLDER_ID) return null;
    return examFolders.find((f) => f.id === openedFolderId) ?? null;
  }, [openedFolderId, examFolders]);

  const openedFolderTitle =
    openedFolderId === GENERAL_FOLDER_ID
      ? 'General Videos'
      : openedFolder?.name || 'Topic Folder';

  const folderVideos = useMemo(() => {
    if (!openedFolderId) return [];
    const knownFolderIds = new Set(examFolders.map((f) => f.id));
    const base =
      openedFolderId === GENERAL_FOLDER_ID
        ? examVideos.filter((v) => !v.folderId || !knownFolderIds.has(v.folderId))
        : examVideos.filter((v) => v.folderId === openedFolderId);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.videoUrl.toLowerCase().includes(q)
    );
  }, [openedFolderId, examFolders, examVideos, searchQuery]);

  const foldersForVideoModal = useMemo(
    () => videoFolders.filter((f) => f.examId === vExamId),
    [videoFolders, vExamId]
  );

  const foldersForImportModal = useMemo(
    () => videoFolders.filter((f) => f.examId === impExamId),
    [videoFolders, impExamId]
  );

  const detectedVideoId = useMemo(() => extractYouTubeVideoId(vUrl), [vUrl]);

  // Auto-resolve YouTube video title when pasting a YouTube URL and title is blank
  useEffect(() => {
    let active = true;
    if (!videoModal || editingVideo || vTitle.trim().length > 0 || !detectedVideoId) {
      return;
    }
    setVResolvingTitle(true);
    fetchYouTubeVideoTitle(detectedVideoId)
      .then((resolved) => {
        if (active && resolved && !vTitle.trim()) {
          setVTitle(resolved);
        }
      })
      .finally(() => {
        if (active) setVResolvingTitle(false);
      });
    return () => {
      active = false;
    };
  }, [detectedVideoId, videoModal]);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const openCreateFolder = () => {
    setEditingFolder(null);
    setFExamId(selectedExamId);
    setFName('');
    setFDesc('');
    setFolderModal(true);
  };

  const openEditFolder = (folder: VideoFolder) => {
    setEditingFolder(folder);
    setFExamId(folder.examId);
    setFName(folder.name);
    setFDesc(folder.description ?? '');
    setFolderModal(true);
  };

  const openAddVideoInCurrentFolder = () => {
    setEditingVideo(null);
    setVExamId(selectedExamId);
    setVFolderId(
      openedFolderId && openedFolderId !== GENERAL_FOLDER_ID ? openedFolderId : null
    );
    setVTitle('');
    setVDesc('Departmental video class');
    setVUrl('');
    setVDuration('15:00');
    setVLang('te');
    setVideoModal(true);
  };

  const openEditVideo = (video: VideoLesson) => {
    setEditingVideo(video);
    setVExamId(video.examId);
    setVFolderId(video.folderId ?? null);
    setVTitle(video.title);
    setVDesc(video.description);
    setVUrl(video.videoUrl);
    setVDuration(video.duration || '15:00');
    setVLang(video.languageCode || 'te');
    setVideoModal(true);
  };

  const openPlaylistImport = () => {
    setImpExamId(selectedExamId);
    setImpFolderId(
      openedFolderId && openedFolderId !== GENERAL_FOLDER_ID ? openedFolderId : null
    );
    setImpNewFolderName('');
    setImpWarning(null);
    setImpPreview([]);
    setImpSelectedIds(new Set());
    setImportModal(true);
  };

  const handleSaveFolder = async () => {
    if (!fName.trim()) return;
    const folderId = editingFolder?.id || `vfolder-${Date.now()}`;
    await saveVideoFolder(
      {
        id: folderId,
        examId: fExamId,
        name: fName.trim(),
        description: fDesc.trim() || null,
        displayOrder:
          editingFolder?.displayOrder ?? videoFolders.filter((f) => f.examId === fExamId).length + 1,
      },
      adminEmail
    );
    setSelectedExamId(fExamId);
    // Automatically open the newly created (or edited) folder in Video Management
    setOpenedFolderId(folderId);
    setSearchQuery('');
    setFolderModal(false);
  };

  const handleSaveVideo = async () => {
    if (!vUrl.trim()) return;
    const vidId = extractYouTubeVideoId(vUrl);
    const finalTitle = vTitle.trim() || (vidId ? `YouTube Lesson (${vidId})` : 'Video Lesson');
    await saveVideo(
      {
        id: editingVideo?.id || `vid-${Date.now()}`,
        examId: vExamId,
        folderId: vFolderId,
        chapterId: editingVideo?.chapterId ?? null,
        title: finalTitle,
        description: vDesc.trim() || 'Departmental video class',
        videoUrl: vUrl.trim(),
        thumbnailUrl: vidId ? getYouTubeThumbnailUrl(vidId) : editingVideo?.thumbnailUrl ?? null,
        duration: vDuration.trim() || '15:00',
        languageCode: vLang,
        isFree: true,
        displayOrder:
          editingVideo?.displayOrder ?? videos.filter((v) => v.examId === vExamId).length + 1,
      },
      adminEmail
    );
    setSelectedExamId(vExamId);
    setOpenedFolderId(vFolderId ?? GENERAL_FOLDER_ID);
    setVideoModal(false);
  };

  const handleFetchPlaylist = async () => {
    setImpWarning(null);
    setImpFetching(true);
    try {
      const result = impPlaylistUrl.trim()
        ? await importYouTubePlaylist(impPlaylistUrl.trim(), impApiKey.trim() || undefined)
        : await parseBulkYouTubeLinks(impBulkLinks);

      if (result.items.length === 0) {
        setImpWarning('No valid YouTube videos were found. Check the playlist link or URLs.');
      } else {
        setImpWarning(result.warning ?? null);
        if (result.playlistTitle && !impNewFolderName.trim() && !impFolderId) {
          setImpNewFolderName(result.playlistTitle);
        }
      }
      setImpPreview(result.items);
      setImpSelectedIds(new Set(result.items.map((i) => i.videoId)));
    } catch (e: any) {
      setImpWarning(e?.message || 'Failed to import playlist.');
      setImpPreview([]);
      setImpSelectedIds(new Set());
    } finally {
      setImpFetching(false);
    }
  };

  const handleConfirmImport = async () => {
    const chosen = impPreview.filter((i) => impSelectedIds.has(i.videoId));
    if (chosen.length === 0) return;

    let targetFolderId = impFolderId;
    if (!targetFolderId && impNewFolderName.trim()) {
      const newFolderId = `vfolder-${Date.now()}`;
      await saveVideoFolder(
        {
          id: newFolderId,
          examId: impExamId,
          name: impNewFolderName.trim(),
          description: 'Imported YouTube Topic Playlist',
          displayOrder: foldersForImportModal.length + 1,
        },
        adminEmail
      );
      targetFolderId = newFolderId;
    }

    const baseOrder = videos.filter((v) => v.examId === impExamId).length;
    const lessons: VideoLesson[] = chosen.map((item, idx) => ({
      id: `vid-${Date.now()}-${idx}-${item.videoId}`,
      examId: impExamId,
      folderId: targetFolderId,
      title: item.title,
      description: item.description || 'Departmental video class',
      videoUrl: item.videoUrl,
      thumbnailUrl: item.thumbnailUrl,
      duration: item.duration || 'Video',
      languageCode: impLang,
      isFree: true,
      displayOrder: baseOrder + idx + 1,
    }));

    await saveVideosBatch(lessons, adminEmail);
    setSelectedExamId(impExamId);
    setOpenedFolderId(targetFolderId ?? GENERAL_FOLDER_ID);
    setImportModal(false);
    setImpPlaylistUrl('');
    setImpBulkLinks('');
    setImpNewFolderName('');
    setImpPreview([]);
    setImpWarning(null);
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Video & Folder Manager" showBack />

      <View style={styles.examBar}>
        {exams.map((ex) => {
          const active = selectedExamId === ex.id;
          return (
            <TouchableOpacity
              key={ex.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setSelectedExamId(ex.id);
                setOpenedFolderId(null);
                setSearchQuery('');
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{ex.code}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!openedFolderId ? (
        /* LEVEL 1: TOPIC FOLDERS LIST */
        <ScrollView contentContainerStyle={styles.scroll}>
          <AdminSectionHeader
            title={`Topic Folders (${examFolders.length})`}
            subtitle="Create a folder or tap any folder to open and upload YouTube videos"
            actionLabel="+ Create Folder"
            onAction={openCreateFolder}
          />

          <View style={styles.quickActionBar}>
            <TouchableOpacity style={styles.quickBtnPrimary} onPress={openCreateFolder}>
              <Ionicons name="folder-open" size={16} color={AppColors.surfaceWhite} />
              <Text style={styles.actionBtnText}>Create Topic Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnMaroon} onPress={openPlaylistImport}>
              <Ionicons name="logo-youtube" size={16} color={AppColors.surfaceWhite} />
              <Text style={styles.actionBtnText}>Import Playlist</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {examFolders.map((folder) => {
              const count = examVideos.filter((v) => v.folderId === folder.id).length;
              return (
                <TouchableOpacity
                  key={folder.id}
                  style={[AppStyles.card, styles.folderRow]}
                  onPress={() => {
                    setOpenedFolderId(folder.id);
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.folderIcon}>
                    <Ionicons name="folder" size={24} color={AppColors.goldGradientEnd} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{folder.name}</Text>
                    <Text style={styles.sub}>
                      {count} {count === 1 ? 'video' : 'videos'}
                      {folder.description ? ` • ${folder.description}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditFolder(folder)}
                  >
                    <Ionicons name="pencil-outline" size={18} color={AppColors.primaryNavy} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() =>
                      confirmAction(
                        'Delete Topic Folder?',
                        `Delete "${folder.name}"? Videos inside will move to General Videos.`,
                        () => deleteVideoFolder(folder.id, adminEmail)
                      )
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={AppColors.errorRed} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
                </TouchableOpacity>
              );
            })}

            {generalVideosCount > 0 && (
              <TouchableOpacity
                style={[AppStyles.card, styles.folderRow]}
                onPress={() => {
                  setOpenedFolderId(GENERAL_FOLDER_ID);
                  setSearchQuery('');
                }}
              >
                <View style={[styles.folderIcon, { backgroundColor: AppColors.secondaryMaroon }]}>
                  <Ionicons name="videocam" size={22} color={AppColors.surfaceWhite} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>General Videos</Text>
                  <Text style={styles.sub}>
                    {generalVideosCount} {generalVideosCount === 1 ? 'video' : 'videos'} not in a folder
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
              </TouchableOpacity>
            )}

            {examFolders.length === 0 && generalVideosCount === 0 && (
              <View style={[AppStyles.card, styles.emptyCard]}>
                <Ionicons name="folder-open-outline" size={44} color={AppColors.textMuted} />
                <Text style={styles.emptyTitle}>No Topic Folders for {selectedExamId.toUpperCase()}</Text>
                <Text style={styles.empty}>
                  Tap "Create Topic Folder" above — the new folder will open right away so you can upload YouTube videos into it.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* LEVEL 2: OPENED FOLDER VIEW (UPLOAD YOUTUBE VIDEOS / CREATE FOLDER / IMPORT PLAYLIST) */
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.breadcrumbBar}>
            <TouchableOpacity
              style={styles.backPill}
              onPress={() => {
                setOpenedFolderId(null);
                setSearchQuery('');
              }}
            >
              <Ionicons name="arrow-back" size={16} color={AppColors.primaryNavy} />
              <Text style={styles.backPillText}>All Folders</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
            <Text style={styles.openedFolderName} numberOfLines={1}>
              {openedFolderTitle}
            </Text>
            {openedFolder && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEditFolder(openedFolder)}>
                <Ionicons name="pencil-outline" size={17} color={AppColors.primaryNavy} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.folderActionBar}>
            <TouchableOpacity style={styles.uploadBtn} onPress={openAddVideoInCurrentFolder}>
              <Ionicons name="add-circle" size={16} color={AppColors.surfaceWhite} />
              <Text style={styles.actionBtnText}>Upload YouTube URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnMaroon} onPress={openPlaylistImport}>
              <Ionicons name="logo-youtube" size={15} color={AppColors.surfaceWhite} />
              <Text style={styles.actionBtnText}>Import Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineSmallBtn} onPress={openCreateFolder}>
              <Ionicons name="folder-open-outline" size={15} color={AppColors.primaryNavy} />
              <Text style={styles.outlineSmallBtnText}>+ Folder</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={AppColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${openedFolderTitle}...`}
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

          <Text style={styles.sectionTitle}>
            Videos in "{openedFolderTitle}" ({folderVideos.length})
          </Text>

          <View style={{ gap: 10, marginTop: 10 }}>
            {folderVideos.map((v, idx) => {
              const vidId = extractYouTubeVideoId(v.videoUrl);
              const thumb = v.thumbnailUrl || (vidId ? getYouTubeThumbnailUrl(vidId) : null);

              return (
                <View key={v.id} style={[AppStyles.card, styles.videoRow]}>
                  <TouchableOpacity
                    style={styles.thumbWrap}
                    onPress={() =>
                      navigation.navigate('VideoPlayer', {
                        video: v,
                        folderVideos,
                        folderName: openedFolderTitle,
                      })
                    }
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Ionicons name="play" size={20} color={AppColors.surfaceWhite} />
                      </View>
                    )}
                    <View style={styles.playOverlay}>
                      <Ionicons name="play" size={13} color={AppColors.surfaceWhite} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() =>
                      navigation.navigate('VideoPlayer', {
                        video: v,
                        folderVideos,
                        folderName: openedFolderTitle,
                      })
                    }
                  >
                    <Text style={styles.lessonIndex}>Lesson {idx + 1}</Text>
                    <Text style={styles.title} numberOfLines={2}>
                      {v.title}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {v.duration} • {v.languageCode.toUpperCase()} • Plays In-App
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditVideo(v)}>
                    <Ionicons name="pencil-outline" size={18} color={AppColors.primaryNavy} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() =>
                      confirmAction('Delete Video?', v.title, () => deleteVideo(v.id, adminEmail))
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={AppColors.errorRed} />
                  </TouchableOpacity>
                </View>
              );
            })}

            {folderVideos.length === 0 && (
              <View style={[AppStyles.card, styles.emptyCard]}>
                <Ionicons name="logo-youtube" size={42} color={AppColors.secondaryMaroon} />
                <Text style={styles.emptyTitle}>Folder is Ready for Videos</Text>
                <Text style={styles.empty}>
                  Tap "Upload YouTube URL" to add a video link to "{openedFolderTitle}", or use "Import Playlist" to add multiple YouTube videos at once.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Create / Edit Topic Folder Modal */}
      <Modal visible={folderModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingFolder ? 'Edit Topic Folder' : 'Create Video Topic Folder'}
            </Text>
            <Text style={styles.fieldLabel}>Exam</Text>
            <View style={styles.chipRow}>
              {exams.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.chip, fExamId === ex.id && styles.chipActive]}
                  onPress={() => setFExamId(ex.id)}
                >
                  <Text style={[styles.chipText, fExamId === ex.id && styles.chipTextActive]}>
                    {ex.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={AppStyles.input}
              placeholder="Folder Name (e.g. PO Guide Part I)"
              value={fName}
              onChangeText={setFName}
            />
            <TextInput
              style={AppStyles.input}
              placeholder="Short description (optional)"
              value={fDesc}
              onChangeText={setFDesc}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setFolderModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={AppStyles.navyButton} onPress={handleSaveFolder}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {editingFolder ? 'Save & Open' : 'Create & Open'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Single YouTube Video Modal */}
      <Modal visible={videoModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScrollCenter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editingVideo ? 'Edit Video Lesson' : 'Upload Video by YouTube URL'}
              </Text>

              <Text style={styles.fieldLabel}>Exam</Text>
              <View style={styles.chipRow}>
                {exams.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.chip, vExamId === ex.id && styles.chipActive]}
                    onPress={() => {
                      setVExamId(ex.id);
                      setVFolderId(null);
                    }}
                  >
                    <Text style={[styles.chipText, vExamId === ex.id && styles.chipTextActive]}>
                      {ex.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Topic Folder</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, vFolderId === null && styles.chipActive]}
                  onPress={() => setVFolderId(null)}
                >
                  <Text style={[styles.chipText, vFolderId === null && styles.chipTextActive]}>
                    General
                  </Text>
                </TouchableOpacity>
                {foldersForVideoModal.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, vFolderId === f.id && styles.chipActive]}
                    onPress={() => setVFolderId(f.id)}
                  >
                    <Text style={[styles.chipText, vFolderId === f.id && styles.chipTextActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={AppStyles.input}
                placeholder="Paste YouTube URL (watch, youtu.be, shorts, live)"
                value={vUrl}
                onChangeText={setVUrl}
                autoCapitalize="none"
              />
              {vUrl.trim().length > 0 && (
                <Text
                  style={[
                    styles.detectHint,
                    { color: detectedVideoId ? AppColors.successGreen : AppColors.errorRed },
                  ]}
                >
                  {detectedVideoId
                    ? `Detected YouTube ID: ${detectedVideoId}${vResolvingTitle ? ' • Fetching title...' : ' • Plays in-app'}`
                    : 'Not a recognized YouTube ID/URL (will load as direct video URL)'}
                </Text>
              )}

              <TextInput
                style={AppStyles.input}
                placeholder="Video Title (auto-filled when YouTube URL is pasted)"
                value={vTitle}
                onChangeText={setVTitle}
              />
              <TextInput
                style={AppStyles.input}
                placeholder="Short description"
                value={vDesc}
                onChangeText={setVDesc}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[AppStyles.input, { flex: 1 }]}
                  placeholder="Duration (e.g. 18:30)"
                  value={vDuration}
                  onChangeText={setVDuration}
                />
                <View style={styles.langSwitch}>
                  {['te', 'en', 'hi'].map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.chip, vLang === lang && styles.chipActive]}
                      onPress={() => setVLang(lang)}
                    >
                      <Text style={[styles.chipText, vLang === lang && styles.chipTextActive]}>
                        {lang.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setVideoModal(false)} style={AppStyles.outlinedButton}>
                  <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={AppStyles.primaryButton} onPress={handleSaveVideo}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {editingVideo ? 'Update Video' : 'Save Video'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* YouTube Playlist / Bulk Import Modal */}
      <Modal visible={importModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScrollCenter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Import YouTube Playlist / Links</Text>

              <Text style={styles.fieldLabel}>Target Exam</Text>
              <View style={styles.chipRow}>
                {exams.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.chip, impExamId === ex.id && styles.chipActive]}
                    onPress={() => {
                      setImpExamId(ex.id);
                      setImpFolderId(null);
                    }}
                  >
                    <Text style={[styles.chipText, impExamId === ex.id && styles.chipTextActive]}>
                      {ex.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Target Topic Folder</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, impFolderId === null && styles.chipActive]}
                  onPress={() => setImpFolderId(null)}
                >
                  <Text style={[styles.chipText, impFolderId === null && styles.chipTextActive]}>
                    + New / General
                  </Text>
                </TouchableOpacity>
                {foldersForImportModal.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, impFolderId === f.id && styles.chipActive]}
                    onPress={() => setImpFolderId(f.id)}
                  >
                    <Text style={[styles.chipText, impFolderId === f.id && styles.chipTextActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {impFolderId === null && (
                <TextInput
                  style={AppStyles.input}
                  placeholder="New Topic Folder Name (optional, else General)"
                  value={impNewFolderName}
                  onChangeText={setImpNewFolderName}
                />
              )}

              <TextInput
                style={AppStyles.input}
                placeholder="YouTube Playlist URL or ID (e.g. https://youtube.com/playlist?list=PL...)"
                value={impPlaylistUrl}
                onChangeText={setImpPlaylistUrl}
                autoCapitalize="none"
              />
              <TextInput
                style={AppStyles.input}
                placeholder="Optional: YouTube Data API v3 Key (for 15+ videos / Web)"
                value={impApiKey}
                onChangeText={setImpApiKey}
                autoCapitalize="none"
              />
              <TextInput
                style={[AppStyles.input, styles.bulkInput]}
                placeholder={'Or paste multiple video links (one per line):\nhttps://youtu.be/...\nLesson 2 | https://youtube.com/watch?v=...'}
                value={impBulkLinks}
                onChangeText={setImpBulkLinks}
                multiline
                autoCapitalize="none"
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={styles.langSwitch}>
                  {['te', 'en', 'hi'].map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.chip, impLang === lang && styles.chipActive]}
                      onPress={() => setImpLang(lang)}
                    >
                      <Text style={[styles.chipText, impLang === lang && styles.chipTextActive]}>
                        {lang.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.fetchBtn}
                  disabled={impFetching || (!impPlaylistUrl.trim() && !impBulkLinks.trim())}
                  onPress={handleFetchPlaylist}
                >
                  {impFetching ? (
                    <ActivityIndicator size="small" color={AppColors.surfaceWhite} />
                  ) : (
                    <Text style={styles.actionBtnText}>Fetch Videos</Text>
                  )}
                </TouchableOpacity>
              </View>

              {!!impWarning && <Text style={styles.warningText}>{impWarning}</Text>}

              {impPreview.length > 0 && (
                <View style={styles.previewBox}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.fieldLabel}>
                      Found {impPreview.length} Videos ({impSelectedIds.size} selected)
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setImpSelectedIds(
                          impSelectedIds.size === impPreview.length
                            ? new Set()
                            : new Set(impPreview.map((i) => i.videoId))
                        )
                      }
                    >
                      <Text style={styles.toggleAllText}>
                        {impSelectedIds.size === impPreview.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
                    {impPreview.map((item, idx) => {
                      const checked = impSelectedIds.has(item.videoId);
                      return (
                        <TouchableOpacity
                          key={item.videoId}
                          style={styles.previewRow}
                          onPress={() => {
                            const next = new Set(impSelectedIds);
                            if (checked) next.delete(item.videoId);
                            else next.add(item.videoId);
                            setImpSelectedIds(next);
                          }}
                        >
                          <Ionicons
                            name={checked ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={checked ? AppColors.secondaryMaroon : AppColors.textMuted}
                          />
                          <Text style={styles.previewTitle} numberOfLines={2}>
                            {idx + 1}. {item.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  onPress={() => {
                    setImportModal(false);
                    setImpWarning(null);
                  }}
                  style={AppStyles.outlinedButton}
                >
                  <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[AppStyles.primaryButton, impSelectedIds.size === 0 && { opacity: 0.5 }]}
                  disabled={impSelectedIds.size === 0}
                  onPress={handleConfirmImport}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    Import ({impSelectedIds.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  examBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    backgroundColor: AppColors.surfaceWarmWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  quickActionBar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: AppColors.primaryNavy,
    paddingVertical: 11,
    borderRadius: 10,
  },
  quickBtnMaroon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: AppColors.secondaryMaroon,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    marginBottom: 12,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: AppColors.surfaceCream,
  },
  backPillText: { fontSize: 12, fontWeight: '800', color: AppColors.primaryNavy },
  openedFolderName: { flex: 1, fontSize: 15, fontWeight: '800', color: AppColors.secondaryMaroon },
  folderActionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  uploadBtn: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: AppColors.primaryNavy,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  outlineSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: AppColors.primaryNavy,
    backgroundColor: AppColors.surfaceWhite,
  },
  outlineSmallBtnText: { fontSize: 12, fontWeight: '800', color: AppColors.primaryNavy },
  folderRow: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoRow: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbWrap: { width: 92, height: 54, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    backgroundColor: AppColors.secondaryMaroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(142, 27, 27, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: { padding: 6 },
  lessonIndex: { fontSize: 10, fontWeight: '800', color: AppColors.secondaryMaroon },
  title: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  sub: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  emptyCard: { padding: 26, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy, textAlign: 'center' },
  empty: { textAlign: 'center', color: AppColors.textMuted, fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  fetchBtn: {
    backgroundColor: AppColors.primaryNavy,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 104,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  searchInput: { flex: 1, fontSize: 13, color: AppColors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: AppColors.surfaceCream,
  },
  chipActive: { backgroundColor: AppColors.primaryNavy },
  chipText: { fontSize: 11, fontWeight: '800', color: AppColors.textSecondary },
  chipTextActive: { color: AppColors.surfaceWhite },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalScrollCenter: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { backgroundColor: AppColors.surfaceWhite, borderRadius: 16, padding: 18, gap: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: AppColors.textSecondary },
  detectHint: { fontSize: 11, fontWeight: '700' },
  langSwitch: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulkInput: { minHeight: 74, textAlignVertical: 'top' },
  warningText: { fontSize: 12, color: AppColors.secondaryMaroon, fontWeight: '600' },
  previewBox: {
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: AppColors.bgWarm,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleAllText: { fontSize: 12, fontWeight: '800', color: AppColors.secondaryMaroon },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  previewTitle: { flex: 1, fontSize: 12, fontWeight: '600', color: AppColors.primaryNavy },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
});
