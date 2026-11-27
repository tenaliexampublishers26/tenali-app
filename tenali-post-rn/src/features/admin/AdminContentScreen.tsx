import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  ImportedYouTubeVideo,
  importYouTubePlaylist,
  parseBulkYouTubeLinks,
} from '../../core/utils/youtubeUtils';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader } from '../../core/widgets/AdminUi';
import { useAdmin } from '../../providers/AdminContext';
import { useAuth } from '../../providers/AuthContext';
import { VideoLesson } from '../../models';

export const AdminContentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    exams,
    videoFolders,
    videos,
    loadDashboardOverview,
    loadVideoFolders,
    loadVideos,
    saveExam,
    deleteExam,
    saveVideoFolder,
    deleteVideoFolder,
    saveVideo,
    saveVideosBatch,
    deleteVideo,
  } = useAdmin();

  const [selectedExamFilter, setSelectedExamFilter] = useState<string>('mts');

  // Exam modal
  const [examModal, setExamModal] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eCode, setECode] = useState('');

  // Topic Folder modal
  const [folderModal, setFolderModal] = useState(false);
  const [fExamId, setFExamId] = useState('mts');
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');

  // Single Video modal
  const [videoModal, setVideoModal] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vUrl, setVUrl] = useState('');
  const [vExamId, setVExamId] = useState('mts');
  const [vFolderId, setVFolderId] = useState<string | null>(null);
  const [vDuration, setVDuration] = useState('15:00');
  const [vLang, setVLang] = useState('te');

  // YouTube Playlist / Bulk Import modal
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

  const filteredFolders = useMemo(
    () => videoFolders.filter((f) => f.examId === selectedExamFilter),
    [videoFolders, selectedExamFilter]
  );

  const filteredVideos = useMemo(
    () => videos.filter((v) => v.examId === selectedExamFilter),
    [videos, selectedExamFilter]
  );

  const foldersForSingleModal = useMemo(
    () => videoFolders.filter((f) => f.examId === vExamId),
    [videoFolders, vExamId]
  );

  const foldersForImportModal = useMemo(
    () => videoFolders.filter((f) => f.examId === impExamId),
    [videoFolders, impExamId]
  );

  const detectedSingleVideoId = useMemo(() => extractYouTubeVideoId(vUrl), [vUrl]);

  const folderNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of videoFolders) map[f.id] = f.name;
    return map;
  }, [videoFolders]);

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
    setSelectedExamFilter(impExamId);
    setImportModal(false);
    setImpPlaylistUrl('');
    setImpBulkLinks('');
    setImpNewFolderName('');
    setImpPreview([]);
    setImpWarning(null);
  };

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

        <Text style={styles.filterHeader}>Filter Video Folders & Lessons by Exam</Text>
        <View style={styles.chipRow}>
          {exams.map((ex) => {
            const active = selectedExamFilter === ex.id;
            return (
              <TouchableOpacity
                key={ex.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedExamFilter(ex.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{ex.code}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <AdminSectionHeader
          title="Topic Folders (1-Level)"
          actionLabel="+ Folder"
          onAction={() => {
            setFExamId(selectedExamFilter);
            setFolderModal(true);
          }}
        />
        <View style={{ gap: 10 }}>
          {filteredFolders.map((folder) => {
            const count = filteredVideos.filter((v) => v.folderId === folder.id).length;
            return (
              <View key={folder.id} style={[AppStyles.card, styles.row]}>
                <View style={styles.folderIcon}>
                  <Ionicons name="folder" size={22} color={AppColors.goldGradientEnd} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{folder.name}</Text>
                  <Text style={styles.sub}>
                    {count} {count === 1 ? 'video' : 'videos'}
                    {folder.description ? ` • ${folder.description}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Delete Topic Folder?',
                      `Delete "${folder.name}"? Videos inside will become General Lessons.`,
                      [
                        { text: 'Cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteVideoFolder(folder.id, adminEmail),
                        },
                      ]
                    )
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
                </TouchableOpacity>
              </View>
            );
          })}
          {filteredFolders.length === 0 && (
            <Text style={styles.empty}>
              No topic folders for {selectedExamFilter.toUpperCase()} yet. Tap + Folder to create one.
            </Text>
          )}
        </View>

        <View style={styles.videoHeaderRow}>
          <Text style={styles.sectionTitle}>Video Lessons ({filteredVideos.length})</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.importBtn}
              onPress={() => {
                setImpExamId(selectedExamFilter);
                setImpFolderId(filteredFolders[0]?.id ?? null);
                setImportModal(true);
              }}
            >
              <Ionicons name="logo-youtube" size={14} color={AppColors.surfaceWhite} />
              <Text style={styles.actionBtnText}>Import Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setVExamId(selectedExamFilter);
                setVFolderId(filteredFolders[0]?.id ?? null);
                setVideoModal(true);
              }}
            >
              <Text style={styles.actionBtnText}>+ Video</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {filteredVideos.map((v) => {
            const folderVideos = filteredVideos.filter((item) => item.folderId === v.folderId);
            const folderLabel = v.folderId ? folderNameById[v.folderId] || 'Topic' : 'General';
            return (
              <TouchableOpacity
                key={v.id}
                style={[AppStyles.card, styles.row]}
                onPress={() =>
                  navigation.navigate('VideoPlayer', {
                    video: v,
                    folderVideos,
                    folderName: folderLabel,
                  })
                }
              >
                <Ionicons name="play-circle" size={28} color={AppColors.secondaryMaroon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {v.title}
                  </Text>
                  <Text style={styles.sub}>
                    {folderLabel} • {v.duration} • {v.languageCode.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteVideo(v.id, adminEmail)}>
                  <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          {filteredVideos.length === 0 && (
            <Text style={styles.empty}>
              No video lessons for {selectedExamFilter.toUpperCase()} yet. Use + Video or Import Playlist.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Add Exam Modal */}
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

      {/* Create Topic Folder Modal */}
      <Modal visible={folderModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Video Topic Folder</Text>
            <Text style={styles.fieldLabel}>Exam</Text>
            <View style={styles.chipRow}>
              {exams.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.chip, fExamId === ex.id && styles.chipActive]}
                  onPress={() => setFExamId(ex.id)}
                >
                  <Text style={[styles.chipText, fExamId === ex.id && styles.chipTextActive]}>{ex.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={AppStyles.input}
              placeholder="Topic Folder Name (e.g. PO Guide Part I)"
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
              <TouchableOpacity
                style={AppStyles.navyButton}
                onPress={async () => {
                  if (!fName.trim()) return;
                  await saveVideoFolder(
                    {
                      id: `vfolder-${Date.now()}`,
                      examId: fExamId,
                      name: fName.trim(),
                      description: fDesc.trim() || null,
                      displayOrder: videoFolders.filter((f) => f.examId === fExamId).length + 1,
                    },
                    adminEmail
                  );
                  setSelectedExamFilter(fExamId);
                  setFName('');
                  setFDesc('');
                  setFolderModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create Folder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Single Video Modal */}
      <Modal visible={videoModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScrollCenter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add YouTube Video Lesson</Text>

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
                    <Text style={[styles.chipText, vExamId === ex.id && styles.chipTextActive]}>{ex.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Topic Folder</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, vFolderId === null && styles.chipActive]}
                  onPress={() => setVFolderId(null)}
                >
                  <Text style={[styles.chipText, vFolderId === null && styles.chipTextActive]}>General</Text>
                </TouchableOpacity>
                {foldersForSingleModal.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, vFolderId === f.id && styles.chipActive]}
                    onPress={() => setVFolderId(f.id)}
                  >
                    <Text style={[styles.chipText, vFolderId === f.id && styles.chipTextActive]}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={AppStyles.input} placeholder="Video Title" value={vTitle} onChangeText={setVTitle} />
              <TextInput
                style={AppStyles.input}
                placeholder="YouTube URL (watch, youtu.be, shorts, live)"
                value={vUrl}
                onChangeText={setVUrl}
                autoCapitalize="none"
              />
              {vUrl.trim().length > 0 && (
                <Text
                  style={[
                    styles.detectHint,
                    { color: detectedSingleVideoId ? AppColors.successGreen : AppColors.errorRed },
                  ]}
                >
                  {detectedSingleVideoId
                    ? `Detected YouTube ID: ${detectedSingleVideoId} (Plays in-app without redirect)`
                    : 'Not a recognized YouTube ID/URL (will load as direct video URL)'}
                </Text>
              )}

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
                <TouchableOpacity
                  style={AppStyles.primaryButton}
                  onPress={async () => {
                    if (!vTitle.trim() || !vUrl.trim()) return;
                    const vidId = extractYouTubeVideoId(vUrl);
                    await saveVideo(
                      {
                        id: `vid-${Date.now()}`,
                        examId: vExamId,
                        folderId: vFolderId,
                        title: vTitle.trim(),
                        description: 'Departmental video class',
                        videoUrl: vUrl.trim(),
                        thumbnailUrl: vidId ? getYouTubeThumbnailUrl(vidId) : null,
                        duration: vDuration.trim() || '15:00',
                        languageCode: vLang,
                        isFree: true,
                        displayOrder: videos.filter((v) => v.examId === vExamId).length + 1,
                      },
                      adminEmail
                    );
                    setSelectedExamFilter(vExamId);
                    setVTitle('');
                    setVUrl('');
                    setVideoModal(false);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
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
                    <Text style={[styles.chipText, impExamId === ex.id && styles.chipTextActive]}>{ex.code}</Text>
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
                    <Text style={[styles.chipText, impFolderId === f.id && styles.chipTextActive]}>{f.name}</Text>
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
  folderIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { color: AppColors.goldGradientEnd, fontSize: 12, fontWeight: '800' },
  title: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  sub: { fontSize: 12, color: AppColors.textSecondary },
  empty: { textAlign: 'center', color: AppColors.textMuted, padding: 16, fontSize: 12 },
  filterHeader: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    color: AppColors.primaryNavy,
  },
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
  videoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: AppColors.primaryNavy },
  headerActions: { flexDirection: 'row', gap: 8 },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AppColors.secondaryMaroon,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtn: {
    backgroundColor: AppColors.primaryNavy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  fetchBtn: {
    backgroundColor: AppColors.primaryNavy,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 104,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
