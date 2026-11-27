import React, { createContext, useContext, useState } from 'react';
import { ImportParseResult } from '../core/utils/mcqImportParser';
import {
  defaultLmsSettings,
  LmsAuditLog,
  LmsLiveTest,
  LmsLiveTestQuestion,
  LmsLiveTestSubmission,
  LmsMcqQuestion,
  LmsSettings,
  LmsStudentSummary,
  McqChapter,
  McqMedium,
  McqQuestionSet,
  McqTopic,
  NoteFolder,
  PdfMaterial,
} from '../models/lms';
import { LmsAdminService } from '../services/lmsAdminService';

interface LmsAdminContextValue {
  settings: LmsSettings;
  auditLogs: LmsAuditLog[];
  topics: McqTopic[];
  mediums: McqMedium[];
  liveTests: LmsLiveTest[];
  noteFolders: NoteFolder[];
  notes: PdfMaterial[];
  students: LmsStudentSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  totalMcqQuestionsCount: number;
  activeLiveTestsCount: number;
  totalLiveTestSubmissionsCount: number;
  loadOverview: () => Promise<void>;
  loadPublicSettings: () => Promise<void>;
  toggleMcqEnabled: (enabled: boolean) => Promise<void>;
  toggleLiveTestEnabled: (enabled: boolean) => Promise<void>;
  updateSettings: (next: LmsSettings) => Promise<void>;
  updateAdminProfile: (name: string, phone: string, newPassword?: string) => Promise<void>;
  loadAuditLogs: (targetType?: string, search?: string) => Promise<void>;
  loadTopics: (publishedOnly?: boolean) => Promise<void>;
  createTopic: (params: {
    name: string;
    parentId?: string | null;
    description?: string;
    displayOrder?: number;
    isPublished?: boolean;
  }) => Promise<void>;
  updateTopic: (topic: McqTopic) => Promise<void>;
  deleteTopicTree: (topicId: string) => Promise<void>;
  getChapters: (topicId: string, publishedOnly?: boolean) => Promise<McqChapter[]>;
  createChapter: (params: {
    topicId: string;
    title: string;
    description?: string;
    displayOrder?: number;
    isPublished?: boolean;
  }) => Promise<void>;
  updateChapter: (chapter: McqChapter) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  createMedium: (code: string, displayName: string) => Promise<void>;
  getQuestionSetsForChapter: (
    chapterId: string,
    publishedOnly?: boolean
  ) => Promise<McqQuestionSet[]>;
  attachChapterLanguage: (chapterId: string, mediumId: string) => Promise<McqQuestionSet>;
  deleteChapterLanguage: (chapterId: string, mediumId: string) => Promise<void>;
  getQuestionsForSet: (setId: string) => Promise<LmsMcqQuestion[]>;
  addMcqQuestion: (q: LmsMcqQuestion) => Promise<void>;
  updateMcqQuestion: (q: LmsMcqQuestion) => Promise<void>;
  deleteMcqQuestion: (questionId: string, setId: string) => Promise<void>;
  clearMcqQuestionSet: (setId: string) => Promise<void>;
  importMcqQuestions: (params: {
    topicId: string;
    chapterId: string;
    mediumId: string;
    mediumCode: string;
    parsed: ImportParseResult;
    fileName: string;
    fileType: string;
    publishImmediately: boolean;
    replaceExisting: boolean;
  }) => Promise<McqQuestionSet>;
  createLiveTest: (params: {
    title: string;
    description: string;
    testDate: string;
    status?: string;
  }) => Promise<LmsLiveTest>;
  updateLiveTest: (test: LmsLiveTest) => Promise<void>;
  deleteLiveTest: (testId: string) => Promise<void>;
  getLiveTestQuestions: (testId: string) => Promise<LmsLiveTestQuestion[]>;
  addLiveTestQuestion: (q: LmsLiveTestQuestion) => Promise<void>;
  deleteLiveTestQuestion: (questionId: string) => Promise<void>;
  getLiveTestSubmissions: (testId: string) => Promise<LmsLiveTestSubmission[]>;
  createNoteFolder: (name: string, parentId?: string | null) => Promise<NoteFolder>;
  deleteNoteFolder: (folderId: string) => Promise<void>;
  createPdfMaterial: (note: PdfMaterial) => Promise<PdfMaterial>;
  deletePdfMaterial: (noteId: string) => Promise<void>;
}

const LmsAdminContext = createContext<LmsAdminContextValue | null>(null);

export const LmsAdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<LmsSettings>(defaultLmsSettings);
  const [auditLogs, setAuditLogs] = useState<LmsAuditLog[]>([]);
  const [topics, setTopics] = useState<McqTopic[]>([]);
  const [mediums, setMediums] = useState<McqMedium[]>([]);
  const [liveTests, setLiveTests] = useState<LmsLiveTest[]>([]);
  const [noteFolders, setNoteFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<PdfMaterial[]>([]);
  const [students, setStudents] = useState<LmsStudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalMcqQuestionsCount = topics.reduce((sum, t) => sum + t.questionCount, 0);
  const activeLiveTestsCount = liveTests.filter((t) => t.status === 'published').length;
  const totalLiveTestSubmissionsCount = liveTests.reduce(
    (sum, t) => sum + t.attemptsCount,
    0
  );

  const loadOverview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [s, t, m, lt, nf, n, stu, logs] = await Promise.all([
        LmsAdminService.getSettings(),
        LmsAdminService.getTopics(),
        LmsAdminService.getMediums(),
        LmsAdminService.getLiveTests(),
        LmsAdminService.getNoteFolders(),
        LmsAdminService.getNotes(),
        LmsAdminService.getStudentsDirectory(),
        LmsAdminService.getAuditLogs(),
      ]);
      setSettings(s);
      setTopics(t);
      setMediums(m);
      setLiveTests(lt);
      setNoteFolders(nf);
      setNotes(n);
      setStudents(stu);
      setAuditLogs(logs);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicSettings = async () => {
    try {
      setSettings(await LmsAdminService.getSettings());
    } catch {
      // ignore
    }
  };

  const toggleMcqEnabled = async (enabled: boolean) => {
    await LmsAdminService.toggleMcqEnabled(enabled);
    setSettings((prev) => ({ ...prev, mcqEnabled: enabled }));
  };

  const toggleLiveTestEnabled = async (enabled: boolean) => {
    await LmsAdminService.toggleLiveTestEnabled(enabled);
    setSettings((prev) => ({ ...prev, liveTestEnabled: enabled }));
  };

  const updateSettings = async (next: LmsSettings) => {
    await LmsAdminService.updateSettings(next);
    setSettings(next);
    setAuditLogs(await LmsAdminService.getAuditLogs());
  };

  const updateAdminProfile = async (
    name: string,
    phone: string,
    newPassword?: string
  ) => {
    await LmsAdminService.updateAdminProfile(name, phone, newPassword);
    setAuditLogs(await LmsAdminService.getAuditLogs());
  };

  const loadAuditLogs = async (targetType = 'all', search = '') => {
    setAuditLogs(await LmsAdminService.getAuditLogs(targetType, search));
  };

  const loadTopics = async (publishedOnly = false) => {
    const [t, m] = await Promise.all([
      LmsAdminService.getTopics(publishedOnly),
      LmsAdminService.getMediums(),
    ]);
    setTopics(t);
    setMediums(m);
  };

  const createTopic = async (params: {
    name: string;
    parentId?: string | null;
    description?: string;
    displayOrder?: number;
    isPublished?: boolean;
  }) => {
    await LmsAdminService.createTopic(params);
    await loadTopics();
  };

  const updateTopic = async (topic: McqTopic) => {
    await LmsAdminService.updateTopic(topic);
    await loadTopics();
  };

  const deleteTopicTree = async (topicId: string) => {
    await LmsAdminService.deleteTopicTree(topicId);
    await loadTopics();
  };

  const getChapters = (topicId: string, publishedOnly = false) =>
    LmsAdminService.getChapters(topicId, publishedOnly);

  const createChapter = async (params: {
    topicId: string;
    title: string;
    description?: string;
    displayOrder?: number;
    isPublished?: boolean;
  }) => {
    await LmsAdminService.createChapter(params);
    await loadTopics();
  };

  const updateChapter = async (chapter: McqChapter) => {
    await LmsAdminService.updateChapter(chapter);
  };

  const deleteChapter = async (chapterId: string) => {
    await LmsAdminService.deleteChapter(chapterId);
    await loadTopics();
  };

  const createMedium = async (code: string, displayName: string) => {
    await LmsAdminService.createMedium(code, displayName);
    setMediums(await LmsAdminService.getMediums());
  };

  const getQuestionSetsForChapter = (chapterId: string, publishedOnly = false) =>
    LmsAdminService.getQuestionSetsForChapter(chapterId, publishedOnly);

  const attachChapterLanguage = (chapterId: string, mediumId: string) =>
    LmsAdminService.attachChapterLanguage(chapterId, mediumId);

  const deleteChapterLanguage = (chapterId: string, mediumId: string) =>
    LmsAdminService.deleteChapterLanguage(chapterId, mediumId);

  const getQuestionsForSet = (setId: string) => LmsAdminService.getQuestionsForSet(setId);

  const addMcqQuestion = async (q: LmsMcqQuestion) => {
    await LmsAdminService.addMcqQuestion(q);
    await loadTopics();
  };

  const updateMcqQuestion = (q: LmsMcqQuestion) => LmsAdminService.updateMcqQuestion(q);

  const deleteMcqQuestion = async (questionId: string, setId: string) => {
    await LmsAdminService.deleteMcqQuestion(questionId, setId);
    await loadTopics();
  };

  const clearMcqQuestionSet = async (setId: string) => {
    await LmsAdminService.clearMcqQuestionSet(setId);
    await loadTopics();
  };

  const importMcqQuestions = async (params: {
    topicId: string;
    chapterId: string;
    mediumId: string;
    mediumCode: string;
    parsed: ImportParseResult;
    fileName: string;
    fileType: string;
    publishImmediately: boolean;
    replaceExisting: boolean;
  }) => {
    const res = await LmsAdminService.importMcqQuestions(params);
    await loadTopics();
    return res;
  };

  const createLiveTest = async (params: {
    title: string;
    description: string;
    testDate: string;
    status?: string;
  }) => {
    const t = await LmsAdminService.createLiveTest(params);
    setLiveTests(await LmsAdminService.getLiveTests());
    return t;
  };

  const updateLiveTest = async (test: LmsLiveTest) => {
    await LmsAdminService.updateLiveTest(test);
    setLiveTests(await LmsAdminService.getLiveTests());
  };

  const deleteLiveTest = async (testId: string) => {
    await LmsAdminService.deleteLiveTest(testId);
    setLiveTests(await LmsAdminService.getLiveTests());
  };

  const getLiveTestQuestions = (testId: string) =>
    LmsAdminService.getLiveTestQuestions(testId);

  const addLiveTestQuestion = async (q: LmsLiveTestQuestion) => {
    await LmsAdminService.addLiveTestQuestion(q);
    setLiveTests(await LmsAdminService.getLiveTests());
  };

  const deleteLiveTestQuestion = async (questionId: string) => {
    await LmsAdminService.deleteLiveTestQuestion(questionId);
    setLiveTests(await LmsAdminService.getLiveTests());
  };

  const getLiveTestSubmissions = (testId: string) =>
    LmsAdminService.getLiveTestSubmissions(testId);

  const createNoteFolder = async (name: string, parentId?: string | null) => {
    const f = await LmsAdminService.createNoteFolder(name, parentId);
    setNoteFolders(await LmsAdminService.getNoteFolders());
    return f;
  };

  const deleteNoteFolder = async (folderId: string) => {
    await LmsAdminService.deleteNoteFolder(folderId);
    setNoteFolders(await LmsAdminService.getNoteFolders());
    setNotes(await LmsAdminService.getNotes());
  };

  const createPdfMaterial = async (note: PdfMaterial) => {
    const created = await LmsAdminService.createPdfMaterial(note);
    setNotes(await LmsAdminService.getNotes());
    return created;
  };

  const deletePdfMaterial = async (noteId: string) => {
    await LmsAdminService.deletePdfMaterial(noteId);
    setNotes(await LmsAdminService.getNotes());
  };

  return (
    <LmsAdminContext.Provider
      value={{
        settings,
        auditLogs,
        topics,
        mediums,
        liveTests,
        noteFolders,
        notes,
        students,
        isLoading,
        errorMessage,
        totalMcqQuestionsCount,
        activeLiveTestsCount,
        totalLiveTestSubmissionsCount,
        loadOverview,
        loadPublicSettings,
        toggleMcqEnabled,
        toggleLiveTestEnabled,
        updateSettings,
        updateAdminProfile,
        loadAuditLogs,
        loadTopics,
        createTopic,
        updateTopic,
        deleteTopicTree,
        getChapters,
        createChapter,
        updateChapter,
        deleteChapter,
        createMedium,
        getQuestionSetsForChapter,
        attachChapterLanguage,
        deleteChapterLanguage,
        getQuestionsForSet,
        addMcqQuestion,
        updateMcqQuestion,
        deleteMcqQuestion,
        clearMcqQuestionSet,
        importMcqQuestions,
        createLiveTest,
        updateLiveTest,
        deleteLiveTest,
        getLiveTestQuestions,
        addLiveTestQuestion,
        deleteLiveTestQuestion,
        getLiveTestSubmissions,
        createNoteFolder,
        deleteNoteFolder,
        createPdfMaterial,
        deletePdfMaterial,
      }}
    >
      {children}
    </LmsAdminContext.Provider>
  );
};

export const useLmsAdmin = () => {
  const ctx = useContext(LmsAdminContext);
  if (!ctx) throw new Error('useLmsAdmin must be used inside LmsAdminProvider');
  return ctx;
};
