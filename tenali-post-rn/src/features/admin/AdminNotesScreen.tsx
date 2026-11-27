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
import * as DocumentPicker from 'expo-document-picker';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader } from '../../core/widgets/AdminUi';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { SizeFormatter } from '../../core/utils/sizeFormatter';

export const AdminNotesScreen: React.FC = () => {
  const {
    noteFolders,
    notes,
    loadOverview,
    createNoteFolder,
    deleteNoteFolder,
    createPdfMaterial,
    deletePdfMaterial,
  } = useLmsAdmin();

  const [folderModal, setFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');

  const [noteModal, setNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [pickedSize, setPickedSize] = useState('1.2 MB');

  useEffect(() => {
    loadOverview();
  }, []);

  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled && res.assets?.length) {
      const f = res.assets[0];
      if (!noteTitle) setNoteTitle(f.name.replace(/\.pdf$/i, ''));
      setPickedSize(SizeFormatter.formatBytes(f.size ?? 102400));
      setNoteUrl(f.uri);
    }
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Notes & PDF Manager" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminSectionHeader
          title="Folders"
          actionLabel="+ Folder"
          onAction={() => setFolderModal(true)}
        />
        <View style={styles.folderGrid}>
          {noteFolders.map((f) => (
            <View key={f.id} style={[AppStyles.card, styles.folderCard]}>
              <Ionicons name="folder" size={22} color={AppColors.goldBorder} />
              <Text style={styles.folderName} numberOfLines={1}>
                {f.name}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete Folder?', f.name, [
                    { text: 'Cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteNoteFolder(f.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={16} color={AppColors.errorRed} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <AdminSectionHeader
          title="PDF Study Materials"
          actionLabel="+ Upload PDF"
          onAction={() => setNoteModal(true)}
        />
        <View style={{ gap: 10 }}>
          {notes.map((n) => (
            <View key={n.id} style={[AppStyles.card, styles.noteRow]}>
              <Ionicons name="document-lock" size={24} color={AppColors.secondaryMaroon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>{n.title}</Text>
                <Text style={styles.noteMeta}>
                  {n.fileSize} • {n.pagesCount} pages
                </Text>
              </View>
              <TouchableOpacity onPress={() => deletePdfMaterial(n.id)}>
                <Ionicons name="trash-outline" size={20} color={AppColors.errorRed} />
              </TouchableOpacity>
            </View>
          ))}
          {notes.length === 0 && (
            <Text style={styles.empty}>No PDFs uploaded yet. Tap + Upload PDF to add one.</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={folderModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Note Folder</Text>
            <TextInput
              style={AppStyles.input}
              placeholder="Folder Name"
              value={folderName}
              onChangeText={setFolderName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setFolderModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.navyButton}
                onPress={async () => {
                  if (!folderName.trim()) return;
                  await createNoteFolder(folderName);
                  setFolderName('');
                  setFolderModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={noteModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Protected PDF Material</Text>
            <TouchableOpacity style={AppStyles.outlinedButton} onPress={pickPdf}>
              <Text style={AppStyles.outlinedButtonText}>Pick PDF File</Text>
            </TouchableOpacity>
            <TextInput
              style={AppStyles.input}
              placeholder="Title"
              value={noteTitle}
              onChangeText={setNoteTitle}
            />
            <TextInput
              style={AppStyles.input}
              placeholder="Description"
              value={noteDesc}
              onChangeText={setNoteDesc}
            />
            <TextInput
              style={AppStyles.input}
              placeholder="PDF URL (https://...)"
              value={noteUrl}
              onChangeText={setNoteUrl}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setNoteModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.primaryButton}
                onPress={async () => {
                  if (!noteTitle.trim()) return;
                  await createPdfMaterial({
                    id: `pdf-${Date.now()}`,
                    title: noteTitle.trim(),
                    description: noteDesc.trim(),
                    categoryCode: 'NOTES',
                    storagePath: '',
                    pdfUrl: noteUrl.trim(),
                    fileSize: pickedSize,
                    pagesCount: 12,
                    isFree: true,
                    downloadCount: 0,
                    allowDownload: false,
                    isPreviewable: true,
                    createdAt: new Date().toISOString(),
                  });
                  setNoteTitle('');
                  setNoteDesc('');
                  setNoteUrl('');
                  setNoteModal(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save PDF</Text>
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
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  folderCard: {
    width: '48%',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderName: { flex: 1, fontSize: 13, fontWeight: '700', color: AppColors.primaryNavy },
  noteRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteTitle: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  noteMeta: { fontSize: 11, color: AppColors.textSecondary },
  empty: { textAlign: 'center', color: AppColors.textMuted, padding: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: AppColors.surfaceWhite, borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
