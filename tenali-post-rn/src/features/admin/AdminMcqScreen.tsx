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
import * as FileSystem from 'expo-file-system';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { AdminSectionHeader, StatusBadge } from '../../core/widgets/AdminUi';
import { useLmsAdmin } from '../../providers/LmsAdminContext';
import { McqImportParser } from '../../core/utils/mcqImportParser';
import { LmsMcqQuestion, McqChapter, McqTopic } from '../../models/lms';

export const AdminMcqScreen: React.FC = () => {
  const {
    topics,
    mediums,
    loadTopics,
    createTopic,
    deleteTopicTree,
    getChapters,
    createChapter,
    getQuestionSetsForChapter,
    attachChapterLanguage,
    getQuestionsForSet,
    addMcqQuestion,
    deleteMcqQuestion,
    importMcqQuestions,
  } = useLmsAdmin();

  const [selectedTopic, setSelectedTopic] = useState<McqTopic | null>(null);
  const [chapters, setChapters] = useState<McqChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<McqChapter | null>(null);
  const [selectedMediumId, setSelectedMediumId] = useState<string>('med-en');
  const [questions, setQuestions] = useState<LmsMcqQuestion[]>([]);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);

  const [newTopicModal, setNewTopicModal] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [newChapterModal, setNewChapterModal] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [addQModal, setAddQModal] = useState(false);

  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    loadTopics();
  }, []);

  const selectTopic = async (t: McqTopic) => {
    setSelectedTopic(t);
    setSelectedChapter(null);
    setQuestions([]);
    const chs = await getChapters(t.id);
    setChapters(chs);
  };

  const selectChapter = async (ch: McqChapter, medId = selectedMediumId) => {
    setSelectedChapter(ch);
    const sets = await getQuestionSetsForChapter(ch.id);
    const match = sets.find((s) => s.mediumId === medId) ?? sets[0];
    if (match) {
      setCurrentSetId(match.id);
      setQuestions(await getQuestionsForSet(match.id));
    } else {
      setCurrentSetId(null);
      setQuestions([]);
    }
  };

  const handleBulkImport = async () => {
    if (!selectedTopic || !selectedChapter) {
      Alert.alert('Select Chapter', 'Please select a topic and chapter first.');
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/json',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const file = res.assets[0];
      const name = file.name || 'import.csv';
      const lower = name.toLowerCase();
      const med = mediums.find((m) => m.id === selectedMediumId);
      const langCode = med?.code || 'en';

      let parsed;
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const b64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        parsed = McqImportParser.parseAndValidateExcel(b64, langCode);
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        parsed = lower.endsWith('.json')
          ? McqImportParser.parseAndValidateJson(text, langCode)
          : McqImportParser.parseAndValidateCsv(text, langCode);
      }

      if (parsed.validQuestions.length === 0) {
        Alert.alert(
          'Import Failed',
          parsed.errors[0]?.message || 'No valid questions found in file.'
        );
        return;
      }

      const targetSet = await importMcqQuestions({
        topicId: selectedTopic.id,
        chapterId: selectedChapter.id,
        mediumId: selectedMediumId,
        mediumCode: langCode,
        parsed,
        fileName: name,
        fileType: lower.endsWith('.json') ? 'json' : lower.endsWith('.xlsx') ? 'xlsx' : 'csv',
        publishImmediately: true,
        replaceExisting: false,
      });
      setCurrentSetId(targetSet.id);
      setQuestions(await getQuestionsForSet(targetSet.id));
      Alert.alert(
        'Import Complete',
        `Imported ${parsed.validQuestions.length} questions (${parsed.errors.length} skipped).`
      );
    } catch (e: any) {
      Alert.alert('Import Error', e?.message ?? String(e));
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedChapter || !qText.trim() || !optA.trim() || !optB.trim()) {
      Alert.alert('Validation', 'Please fill question text and options.');
      return;
    }
    let setId = currentSetId;
    if (!setId) {
      const s = await attachChapterLanguage(selectedChapter.id, selectedMediumId);
      setId = s.id;
      setCurrentSetId(s.id);
    }
    const med = mediums.find((m) => m.id === selectedMediumId);
    await addMcqQuestion({
      id: `q-${Date.now()}`,
      questionSetId: setId,
      chapterId: selectedChapter.id,
      questionKey: `Q${questions.length + 1}`,
      questionText: qText.trim(),
      optionA: optA.trim(),
      optionB: optB.trim(),
      optionC: optC.trim() || 'None of the above',
      optionD: optD.trim() || 'All of the above',
      correctOption: correct,
      explanation: explanation.trim(),
      language: med?.code || 'en',
      difficulty: 'medium',
      displayOrder: questions.length + 1,
      status: 'published',
    });
    setQuestions(await getQuestionsForSet(setId));
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExplanation('');
    setAddQModal(false);
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="MCQ Bank & Importer" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminSectionHeader
          title="1. Subjects / Topics"
          actionLabel="+ Topic"
          onAction={() => setNewTopicModal(true)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
          {topics.map((t) => {
            const active = selectedTopic?.id === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => selectTopic(t)}
                onLongPress={() =>
                  Alert.alert('Delete Topic?', t.name, [
                    { text: 'Cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteTopicTree(t.id) },
                  ])
                }
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{t.name}</Text>
                <Text style={[styles.pillSub, active && { color: '#CBD5E1' }]}>
                  {t.questionCount} Qs
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedTopic && (
          <>
            <AdminSectionHeader
              title="2. Chapters"
              actionLabel="+ Chapter"
              onAction={() => setNewChapterModal(true)}
            />
            <View style={{ gap: 8 }}>
              {chapters.map((ch) => {
                const active = selectedChapter?.id === ch.id;
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[AppStyles.card, styles.chapterRow, active && styles.chapterActive]}
                    onPress={() => selectChapter(ch)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chapterTitle}>{ch.title}</Text>
                      <Text style={styles.chapterMeta}>{ch.questionCount} Questions</Text>
                    </View>
                    <StatusBadge
                      label={ch.isPublished ? 'Published' : 'Draft'}
                      variant={ch.isPublished ? 'success' : 'warning'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {selectedChapter && (
          <>
            <AdminSectionHeader title="3. Language & Questions" />
            <View style={styles.medRow}>
              {mediums.map((m) => {
                const active = selectedMediumId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.medChip, active && styles.medChipActive]}
                    onPress={() => {
                      setSelectedMediumId(m.id);
                      selectChapter(selectedChapter, m.id);
                    }}
                  >
                    <Text style={[styles.medText, active && { color: '#fff' }]}>
                      {m.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[AppStyles.navyButton, { flex: 1 }]}
                onPress={() => setAddQModal(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.btnText}>Add Question</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[AppStyles.primaryButton, { flex: 1 }]}
                onPress={handleBulkImport}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Import CSV/JSON/XLSX</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginTop: 8 }}>
              {questions.map((q, idx) => (
                <View key={q.id} style={[AppStyles.card, styles.qCard]}>
                  <View style={styles.qHead}>
                    <Text style={styles.qKey}>
                      {q.questionKey || `Q${idx + 1}`} • Ans: {q.correctOption}
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await deleteMcqQuestion(q.id, q.questionSetId);
                        if (currentSetId) setQuestions(await getQuestionsForSet(currentSetId));
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={AppColors.errorRed} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.qText}>{q.questionText}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* New Topic Modal */}
      <Modal visible={newTopicModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create MCQ Topic</Text>
            <TextInput
              style={AppStyles.input}
              placeholder="Topic name (e.g. PO Guide Part II)"
              value={topicName}
              onChangeText={setTopicName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setNewTopicModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.navyButton}
                onPress={async () => {
                  if (!topicName.trim()) return;
                  await createTopic({ name: topicName });
                  setTopicName('');
                  setNewTopicModal(false);
                }}
              >
                <Text style={styles.btnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Chapter Modal */}
      <Modal visible={newChapterModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Chapter</Text>
            <TextInput
              style={AppStyles.input}
              placeholder="Chapter title"
              value={chapterTitle}
              onChangeText={setChapterTitle}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setNewChapterModal(false)} style={AppStyles.outlinedButton}>
                <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={AppStyles.navyButton}
                onPress={async () => {
                  if (!chapterTitle.trim() || !selectedTopic) return;
                  await createChapter({ topicId: selectedTopic.id, title: chapterTitle });
                  setChapters(await getChapters(selectedTopic.id));
                  setChapterTitle('');
                  setNewChapterModal(false);
                }}
              >
                <Text style={styles.btnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Question Modal */}
      <Modal visible={addQModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add MCQ Question</Text>
              <TextInput
                style={[AppStyles.input, { minHeight: 70 }]}
                placeholder="Question text"
                multiline
                value={qText}
                onChangeText={setQText}
              />
              <TextInput style={AppStyles.input} placeholder="Option A" value={optA} onChangeText={setOptA} />
              <TextInput style={AppStyles.input} placeholder="Option B" value={optB} onChangeText={setOptB} />
              <TextInput style={AppStyles.input} placeholder="Option C" value={optC} onChangeText={setOptC} />
              <TextInput style={AppStyles.input} placeholder="Option D" value={optD} onChangeText={setOptD} />
              <View style={styles.medRow}>
                {(['A', 'B', 'C', 'D'] as const).map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.medChip, correct === k && styles.medChipActive]}
                    onPress={() => setCorrect(k)}
                  >
                    <Text style={[styles.medText, correct === k && { color: '#fff' }]}>
                      Ans: {k}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={AppStyles.input}
                placeholder="Explanation (optional)"
                value={explanation}
                onChangeText={setExplanation}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setAddQModal(false)} style={AppStyles.outlinedButton}>
                  <Text style={AppStyles.outlinedButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={AppStyles.primaryButton} onPress={handleAddQuestion}>
                  <Text style={styles.btnText}>Save Question</Text>
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
  hList: { gap: 10, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: AppColors.surfaceWhite,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  pillActive: { backgroundColor: AppColors.primaryNavy, borderColor: AppColors.primaryNavy },
  pillText: { fontSize: 13, fontWeight: '800', color: AppColors.primaryNavy },
  pillTextActive: { color: '#fff' },
  pillSub: { fontSize: 11, color: AppColors.textMuted, marginTop: 2 },
  chapterRow: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterActive: { borderColor: AppColors.secondaryMaroon, borderWidth: 1.5 },
  chapterTitle: { fontSize: 14, fontWeight: '700', color: AppColors.primaryNavy },
  chapterMeta: { fontSize: 11, color: AppColors.textSecondary },
  medRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  medChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: AppColors.surfaceCream,
  },
  medChipActive: { backgroundColor: AppColors.primaryNavy },
  medText: { fontSize: 12, fontWeight: '700', color: AppColors.primaryNavy },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  qCard: { padding: 12, gap: 6 },
  qHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qKey: { fontSize: 12, fontWeight: '800', color: AppColors.secondaryMaroon },
  qText: { fontSize: 13, color: AppColors.textPrimary, fontWeight: '600' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: {
    backgroundColor: AppColors.surfaceWhite,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
