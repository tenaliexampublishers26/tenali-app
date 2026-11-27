import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConstants } from '../core/constants';
import { DataSync } from '../core/utils/dataSync';
import { ImportParseResult } from '../core/utils/mcqImportParser';
import { SizeFormatter } from '../core/utils/sizeFormatter';
import {
  defaultLmsSettings,
  LmsAuditLog,
  LmsLiveTest,
  lmsLiveTestFromJson,
  LmsLiveTestQuestion,
  lmsLiveTestQuestionFromJson,
  LmsLiveTestSubmission,
  lmsLiveTestSubmissionFromJson,
  LmsMcqQuestion,
  lmsMcqQuestionFromJson,
  LmsSettings,
  lmsSettingsFromKeyValueRows,
  LmsStudentSummary,
  McqAttemptRecord,
  McqChapter,
  mcqChapterFromJson,
  McqImportLog,
  McqMedium,
  mcqMediumFromJson,
  McqQuestionSet,
  mcqQuestionSetFromJson,
  McqTopic,
  mcqTopicFromJson,
  NoteFolder,
  noteFolderFromJson,
  PdfMaterial,
  pdfMaterialFromJson,
} from '../models/lms';
import { AuthService } from './authService';
import { SupabaseService } from './supabaseService';

const uid = () => `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const LMS_STORE_STORAGE_KEY = 'tenali_post_lms_store_v1';

class LmsAdminServiceClass {
  private _settings: LmsSettings = { ...defaultLmsSettings };
  private _auditLogs: LmsAuditLog[] = [];
  private _topics: McqTopic[] = [];
  private _chapters: McqChapter[] = [];
  private _mediums: McqMedium[] = [];
  private _questionSets: McqQuestionSet[] = [];
  private _mcqQuestions: LmsMcqQuestion[] = [];
  private _importLogs: McqImportLog[] = [];
  private _mcqAttempts: McqAttemptRecord[] = [];
  private _bookmarksByUser: Record<string, Set<string>> = {};

  private _liveTests: LmsLiveTest[] = [];
  private _liveTestQuestions: LmsLiveTestQuestion[] = [];
  private _liveTestSubmissions: LmsLiveTestSubmission[] = [];

  private _noteFolders: NoteFolder[] = [];
  private _pdfMaterials: PdfMaterial[] = [];
  private _localUsers: Record<string, any>[] = [];
  private _hydrated = false;

  constructor() {
    this._seedInitialLocalData();
  }

  private get _hasLiveAuthSession(): boolean {
    const c = SupabaseService.client;
    return c !== null && !AuthService.isLocalSession;
  }

  private _seedInitialLocalData() {
    if (this._mediums.length > 0) return;

    this._mediums = [
      { id: 'med-en', code: 'en', displayName: 'English', isActive: true },
      { id: 'med-te', code: 'te', displayName: 'Telugu', isActive: true },
      { id: 'med-hi', code: 'hi', displayName: 'Hindi', isActive: true },
    ];
  }

  async hydrate(): Promise<void> {
    if (this._hydrated) return;
    this._hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(LMS_STORE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.settings) this._settings = { ...defaultLmsSettings, ...parsed.settings };
      if (Array.isArray(parsed.topics)) this._topics = parsed.topics;
      if (Array.isArray(parsed.chapters)) this._chapters = parsed.chapters;
      if (Array.isArray(parsed.mediums) && parsed.mediums.length > 0) this._mediums = parsed.mediums;
      if (Array.isArray(parsed.questionSets)) this._questionSets = parsed.questionSets;
      if (Array.isArray(parsed.mcqQuestions)) this._mcqQuestions = parsed.mcqQuestions;
      if (Array.isArray(parsed.liveTests)) this._liveTests = parsed.liveTests;
      if (Array.isArray(parsed.liveTestQuestions)) this._liveTestQuestions = parsed.liveTestQuestions;
      if (Array.isArray(parsed.liveTestSubmissions)) this._liveTestSubmissions = parsed.liveTestSubmissions;
      if (Array.isArray(parsed.noteFolders)) this._noteFolders = parsed.noteFolders;
      if (Array.isArray(parsed.pdfMaterials)) this._pdfMaterials = parsed.pdfMaterials;
      if (Array.isArray(parsed.auditLogs)) this._auditLogs = parsed.auditLogs;
    } catch (e) {
      console.warn('[LmsAdminService] Local store hydration notice:', e);
    }
  }

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        LMS_STORE_STORAGE_KEY,
        JSON.stringify({
          settings: this._settings,
          topics: this._topics,
          chapters: this._chapters,
          mediums: this._mediums,
          questionSets: this._questionSets,
          mcqQuestions: this._mcqQuestions,
          liveTests: this._liveTests,
          liveTestQuestions: this._liveTestQuestions,
          liveTestSubmissions: this._liveTestSubmissions,
          noteFolders: this._noteFolders,
          pdfMaterials: this._pdfMaterials,
          auditLogs: this._auditLogs.slice(0, 100),
        })
      );
    } catch (e) {
      console.warn('[LmsAdminService] Local store persist notice:', e);
    }
  }

  private _recordLocalAudit(params: {
    actionType: string;
    targetType: string;
    targetName: string;
    previousValue?: Record<string, any> | null;
    newValue?: Record<string, any> | null;
  }) {
    const user = AuthService.currentUser;
    this._auditLogs.unshift({
      id: uid(),
      adminId: user?.id ?? 'admin-01',
      adminName: user?.fullName ?? 'Tenali Postal Admin',
      adminEmail: user?.email ?? AppConstants.authorizedAdminEmail,
      actionType: params.actionType,
      targetType: params.targetType,
      targetName: params.targetName,
      previousValue: params.previousValue ?? null,
      newValue: params.newValue ?? null,
      ipAddress: 'mobile-app',
      locationName: 'Tenali, Andhra Pradesh, India',
      createdAt: new Date().toISOString(),
    });
  }

  // 1. Settings & Audit
  async getSettings(): Promise<LmsSettings> {
    await this.hydrate();
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client.from('settings').select('key, value');
        if (data) {
          this._settings = lmsSettingsFromKeyValueRows(data);
          await this._persist();
          return this._settings;
        }
      } catch {
        // fallback
      }
    }
    return this._settings;
  }

  async toggleMcqEnabled(enabled: boolean): Promise<void> {
    await this.hydrate();
    const prev = { mcq_enabled: String(this._settings.mcqEnabled) };
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        await SupabaseService.client.from('settings').upsert(
          { key: 'mcq_enabled', value: String(enabled), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      } catch {
        // ignore
      }
    }
    this._settings = { ...this._settings, mcqEnabled: enabled };
    this._recordLocalAudit({
      actionType: 'TOGGLE_MCQ',
      targetType: 'settings',
      targetName: 'mcq_enabled',
      previousValue: prev,
      newValue: { mcq_enabled: String(enabled) },
    });
    await this._persist();
    DataSync.emit('settings');
  }

  async toggleLiveTestEnabled(enabled: boolean): Promise<void> {
    await this.hydrate();
    const prev = { live_test_enabled: String(this._settings.liveTestEnabled) };
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        await SupabaseService.client.from('settings').upsert(
          { key: 'live_test_enabled', value: String(enabled), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      } catch {
        // ignore
      }
    }
    this._settings = { ...this._settings, liveTestEnabled: enabled };
    this._recordLocalAudit({
      actionType: 'TOGGLE_LIVE_TESTS',
      targetType: 'settings',
      targetName: 'live_test_enabled',
      previousValue: prev,
      newValue: { live_test_enabled: String(enabled) },
    });
    await this._persist();
    DataSync.emit('settings');
  }

  async updateSettings(next: LmsSettings): Promise<void> {
    await this.hydrate();
    const prev = { ...this._settings };
    this._settings = next;
    this._recordLocalAudit({
      actionType: 'UPDATE_SETTINGS',
      targetType: 'settings',
      targetName: 'Global LMS Settings',
      previousValue: prev,
      newValue: next,
    });
    await this._persist();
    DataSync.emit('settings');
  }

  async updateAdminProfile(name: string, phone: string, _newPassword?: string): Promise<void> {
    const current = AuthService.currentUser;
    if (current) {
      AuthService.setCurrentUser(
        { ...current, fullName: name.trim(), phoneNumber: phone.trim() },
        true
      );
    }
    this._recordLocalAudit({
      actionType: 'UPDATE_PROFILE',
      targetType: 'admin',
      targetName: name.trim(),
    });
  }

  async getAuditLogs(targetType = 'all', search = ''): Promise<LmsAuditLog[]> {
    return this._auditLogs.filter((log) => {
      if (targetType !== 'all' && log.targetType !== targetType) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          log.actionType.toLowerCase().includes(q) ||
          log.targetName.toLowerCase().includes(q) ||
          log.adminEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  // 2. MCQ Hierarchy
  async getTopics(publishedOnly = false): Promise<McqTopic[]> {
    await this.hydrate();
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        let q = SupabaseService.client.from('mcq_topics').select().order('display_order');
        if (publishedOnly) q = q.eq('is_published', true);
        const { data, error } = await q;
        if (!error && Array.isArray(data)) {
          this._topics = data.map(mcqTopicFromJson);
          await this._persist();
        }
      } catch {
        // fallback
      }
    }
    return this._topics
      .filter((t) => !publishedOnly || t.isPublished)
      .map((t) => {
        const chapters = this._chapters.filter((c) => c.topicId === t.id);
        const qCount = this._mcqQuestions.filter((q) =>
          chapters.some((c) => c.id === q.chapterId)
        ).length;
        return { ...t, chapterCount: chapters.length, questionCount: qCount };
      });
  }

  async createTopic(params: {
    name: string;
    parentId?: string | null;
    description?: string;
    displayOrder?: number;
    isPublished?: boolean;
  }): Promise<McqTopic> {
    await this.hydrate();
    const topic: McqTopic = {
      id: uid(),
      slug: SizeFormatter.slugify(params.name),
      name: params.name.trim(),
      category: 'Departmental Rules',
      description: params.description ?? '',
      icon: 'book-open',
      displayOrder: params.displayOrder ?? this._topics.length + 1,
      isPublished: params.isPublished ?? true,
      isActive: true,
      parentId: params.parentId ?? null,
      chapterCount: 0,
      questionCount: 0,
    };
    this._topics.push(topic);
    this._recordLocalAudit({
      actionType: 'CREATE_TOPIC',
      targetType: 'mcq_topic',
      targetName: topic.name,
    });
    await this._persist();
    DataSync.emit('mcq');
    return topic;
  }

  async updateTopic(topic: McqTopic): Promise<void> {
    await this.hydrate();
    const idx = this._topics.findIndex((t) => t.id === topic.id);
    if (idx !== -1) this._topics[idx] = topic;
    this._recordLocalAudit({
      actionType: 'UPDATE_TOPIC',
      targetType: 'mcq_topic',
      targetName: topic.name,
    });
    await this._persist();
    DataSync.emit('mcq');
  }

  async deleteTopicTree(topicId: string): Promise<void> {
    await this.hydrate();
    const chIds = this._chapters.filter((c) => c.topicId === topicId).map((c) => c.id);
    this._mcqQuestions = this._mcqQuestions.filter((q) => !chIds.includes(q.chapterId ?? ''));
    this._questionSets = this._questionSets.filter((s) => !chIds.includes(s.chapterId));
    this._chapters = this._chapters.filter((c) => c.topicId !== topicId);
    this._topics = this._topics.filter((t) => t.id !== topicId);
    this._recordLocalAudit({
      actionType: 'DELETE_TOPIC',
      targetType: 'mcq_topic',
      targetName: topicId,
    });
    await this._persist();
    DataSync.emit('mcq');
  }

  async getChapters(topicId: string, publishedOnly = false): Promise<McqChapter[]> {
    await this.hydrate();
    return this._chapters
      .filter((c) => c.topicId === topicId && (!publishedOnly || c.isPublished))
      .map((c) => {
        const qCount = this._mcqQuestions.filter((q) => q.chapterId === c.id).length;
        const pubSets = this._questionSets.filter(
          (s) => s.chapterId === c.id && s.status === 'published'
        ).length;
        return { ...c, questionCount: qCount, publishedSetsCount: pubSets };
      });
  }

  async createChapter(params: {
    topicId: string;
    title: string;
    description?: string;
    displayOrder?: number;
    isPublished?: boolean;
  }): Promise<McqChapter> {
    await this.hydrate();
    const chapter: McqChapter = {
      id: uid(),
      topicId: params.topicId,
      title: params.title.trim(),
      slug: SizeFormatter.slugify(params.title),
      description: params.description ?? null,
      displayOrder: params.displayOrder ?? 1,
      isPublished: params.isPublished ?? true,
      questionCount: 0,
      publishedSetsCount: 0,
    };
    this._chapters.push(chapter);
    this._recordLocalAudit({
      actionType: 'CREATE_CHAPTER',
      targetType: 'mcq_chapter',
      targetName: chapter.title,
    });
    await this._persist();
    DataSync.emit('mcq');
    return chapter;
  }

  async updateChapter(chapter: McqChapter): Promise<void> {
    await this.hydrate();
    const idx = this._chapters.findIndex((c) => c.id === chapter.id);
    if (idx !== -1) this._chapters[idx] = chapter;
    await this._persist();
    DataSync.emit('mcq');
  }

  async deleteChapter(chapterId: string): Promise<void> {
    await this.hydrate();
    this._mcqQuestions = this._mcqQuestions.filter((q) => q.chapterId !== chapterId);
    this._questionSets = this._questionSets.filter((s) => s.chapterId !== chapterId);
    this._chapters = this._chapters.filter((c) => c.id !== chapterId);
    await this._persist();
    DataSync.emit('mcq');
  }

  async getMediums(): Promise<McqMedium[]> {
    await this.hydrate();
    return [...this._mediums];
  }

  async createMedium(code: string, displayName: string): Promise<McqMedium> {
    await this.hydrate();
    const m: McqMedium = {
      id: `med-${code.toLowerCase()}`,
      code: code.toLowerCase(),
      displayName,
      isActive: true,
    };
    this._mediums.push(m);
    await this._persist();
    DataSync.emit('mcq');
    return m;
  }

  async getQuestionSetsForChapter(
    chapterId: string,
    publishedOnly = false
  ): Promise<McqQuestionSet[]> {
    await this.hydrate();
    return this._questionSets
      .filter((s) => s.chapterId === chapterId && (!publishedOnly || s.status === 'published'))
      .map((s) => ({
        ...s,
        questionCount: this._mcqQuestions.filter((q) => q.questionSetId === s.id).length,
      }));
  }

  async attachChapterLanguage(chapterId: string, mediumId: string): Promise<McqQuestionSet> {
    await this.hydrate();
    const existing = this._questionSets.find(
      (s) => s.chapterId === chapterId && s.mediumId === mediumId
    );
    if (existing) return existing;
    const set: McqQuestionSet = {
      id: uid(),
      chapterId,
      mediumId,
      version: 1,
      status: 'published',
      questionCount: 0,
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    this._questionSets.push(set);
    await this._persist();
    DataSync.emit('mcq');
    return set;
  }

  async deleteChapterLanguage(chapterId: string, mediumId: string): Promise<void> {
    await this.hydrate();
    const setIds = this._questionSets
      .filter((s) => s.chapterId === chapterId && s.mediumId === mediumId)
      .map((s) => s.id);
    this._mcqQuestions = this._mcqQuestions.filter((q) => !setIds.includes(q.questionSetId));
    this._questionSets = this._questionSets.filter((s) => !setIds.includes(s.id));
    await this._persist();
    DataSync.emit('mcq');
  }

  async getQuestionsForSet(setId: string): Promise<LmsMcqQuestion[]> {
    await this.hydrate();
    return this._mcqQuestions
      .filter((q) => q.questionSetId === setId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getPublishedQuestionsForChapter(
    chapterId: string,
    languageCode: string
  ): Promise<LmsMcqQuestion[]> {
    await this.hydrate();
    const normLang = languageCode.toLowerCase();
    return this._mcqQuestions
      .filter(
        (q) =>
          q.chapterId === chapterId &&
          q.language.toLowerCase() === normLang &&
          q.status === 'published'
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async addMcqQuestion(q: LmsMcqQuestion): Promise<void> {
    await this.hydrate();
    this._mcqQuestions.push({ ...q, id: q.id || uid() });
    await this._persist();
    DataSync.emit('mcq');
  }

  async updateMcqQuestion(q: LmsMcqQuestion): Promise<void> {
    await this.hydrate();
    const idx = this._mcqQuestions.findIndex((x) => x.id === q.id);
    if (idx !== -1) this._mcqQuestions[idx] = q;
    await this._persist();
    DataSync.emit('mcq');
  }

  async deleteMcqQuestion(questionId: string, _setId: string): Promise<void> {
    await this.hydrate();
    this._mcqQuestions = this._mcqQuestions.filter((q) => q.id !== questionId);
    await this._persist();
    DataSync.emit('mcq');
  }

  async clearMcqQuestionSet(setId: string): Promise<void> {
    await this.hydrate();
    this._mcqQuestions = this._mcqQuestions.filter((q) => q.questionSetId !== setId);
    await this._persist();
    DataSync.emit('mcq');
  }

  async importMcqQuestions(params: {
    topicId: string;
    chapterId: string;
    mediumId: string;
    mediumCode: string;
    parsed: ImportParseResult;
    fileName: string;
    fileType: string;
    publishImmediately: boolean;
    replaceExisting: boolean;
  }): Promise<McqQuestionSet> {
    await this.hydrate();
    let targetSet = this._questionSets.find(
      (s) => s.chapterId === params.chapterId && s.mediumId === params.mediumId
    );
    if (!targetSet) {
      targetSet = await this.attachChapterLanguage(params.chapterId, params.mediumId);
    }
    if (params.replaceExisting) {
      await this.clearMcqQuestionSet(targetSet.id);
    }
    const status = params.publishImmediately ? 'published' : 'draft';
    for (const row of params.parsed.validQuestions) {
      this._mcqQuestions.push({
        id: uid(),
        questionSetId: targetSet.id,
        chapterId: params.chapterId,
        questionKey: row.questionKey,
        questionText: row.questionText,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctOption: row.correctOption,
        explanation: row.explanation,
        language: params.mediumCode,
        difficulty: 'medium',
        displayOrder: row.displayOrder,
        status,
      });
    }
    this._importLogs.unshift({
      id: uid(),
      topicId: params.topicId,
      chapterId: params.chapterId,
      mediumId: params.mediumId,
      fileName: params.fileName,
      fileType: params.fileType,
      status: params.parsed.errors.length ? 'partial' : 'success',
      totalRows: params.parsed.totalRows,
      validRows: params.parsed.validQuestions.length,
      invalidRows: params.parsed.errors.length,
      createdAt: new Date().toISOString(),
    });
    this._recordLocalAudit({
      actionType: 'IMPORT_MCQS',
      targetType: 'mcq_set',
      targetName: `${params.fileName} (${params.parsed.validQuestions.length} Qs)`,
    });
    await this._persist();
    DataSync.emit('mcq');
    return targetSet;
  }

  // 3. Live Tests
  async getLiveTests(): Promise<LmsLiveTest[]> {
    await this.hydrate();
    return this._liveTests.map((t) => ({
      ...t,
      questionCount: this._liveTestQuestions.filter((q) => q.testId === t.id).length,
      attemptsCount: this._liveTestSubmissions.filter((s) => s.testId === t.id).length,
    }));
  }

  async createLiveTest(params: {
    title: string;
    description: string;
    testDate: string;
    status?: string;
  }): Promise<LmsLiveTest> {
    await this.hydrate();
    const t: LmsLiveTest = {
      id: uid(),
      title: params.title.trim(),
      description: params.description.trim(),
      testDate: params.testDate,
      status: params.status ?? 'draft',
      questionCount: 0,
      answersReleased: false,
      attemptsCount: 0,
      createdAt: new Date().toISOString(),
    };
    this._liveTests.unshift(t);
    await this._persist();
    DataSync.emit('liveTests');
    return t;
  }

  async updateLiveTest(test: LmsLiveTest): Promise<void> {
    await this.hydrate();
    const idx = this._liveTests.findIndex((t) => t.id === test.id);
    if (idx !== -1) this._liveTests[idx] = test;
    await this._persist();
    DataSync.emit('liveTests');
  }

  async deleteLiveTest(testId: string): Promise<void> {
    await this.hydrate();
    this._liveTests = this._liveTests.filter((t) => t.id !== testId);
    this._liveTestQuestions = this._liveTestQuestions.filter((q) => q.testId !== testId);
    await this._persist();
    DataSync.emit('liveTests');
  }

  async getLiveTestQuestions(testId: string): Promise<LmsLiveTestQuestion[]> {
    await this.hydrate();
    return this._liveTestQuestions
      .filter((q) => q.testId === testId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async addLiveTestQuestion(q: LmsLiveTestQuestion): Promise<void> {
    await this.hydrate();
    this._liveTestQuestions.push({ ...q, id: q.id || uid() });
    await this._persist();
    DataSync.emit('liveTests');
  }

  async deleteLiveTestQuestion(questionId: string): Promise<void> {
    await this.hydrate();
    this._liveTestQuestions = this._liveTestQuestions.filter((q) => q.id !== questionId);
    await this._persist();
    DataSync.emit('liveTests');
  }

  async getLiveTestSubmissions(testId: string): Promise<LmsLiveTestSubmission[]> {
    await this.hydrate();
    return this._liveTestSubmissions
      .filter((s) => s.testId === testId)
      .sort((a, b) => b.marksObtained - a.marksObtained)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));
  }

  // 4. Notes & Folders
  async getNoteFolders(): Promise<NoteFolder[]> {
    await this.hydrate();
    return [...this._noteFolders];
  }

  async createNoteFolder(name: string, parentId?: string | null): Promise<NoteFolder> {
    await this.hydrate();
    const now = new Date().toISOString();
    const folder: NoteFolder = {
      id: uid(),
      name: name.trim(),
      parentId: parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this._noteFolders.push(folder);
    await this._persist();
    DataSync.emit('notes');
    return folder;
  }

  async deleteNoteFolder(folderId: string): Promise<void> {
    await this.hydrate();
    this._noteFolders = this._noteFolders.filter((f) => f.id !== folderId);
    this._pdfMaterials = this._pdfMaterials.map((n) =>
      n.folderId === folderId ? { ...n, folderId: null } : n
    );
    await this._persist();
    DataSync.emit('notes');
  }

  async getNotes(): Promise<PdfMaterial[]> {
    await this.hydrate();
    return [...this._pdfMaterials];
  }

  async createPdfMaterial(note: PdfMaterial): Promise<PdfMaterial> {
    await this.hydrate();
    const created = { ...note, id: note.id || uid() };
    this._pdfMaterials.unshift(created);
    await this._persist();
    DataSync.emit('notes');
    return created;
  }

  async deletePdfMaterial(noteId: string): Promise<void> {
    await this.hydrate();
    this._pdfMaterials = this._pdfMaterials.filter((n) => n.id !== noteId);
    await this._persist();
    DataSync.emit('notes');
  }

  // 5. Students Directory
  async getStudentsDirectory(): Promise<LmsStudentSummary[]> {
    return this._localUsers.map((u) => {
      const uidStr = String(u.id);
      return {
        id: uidStr,
        name: String(u.name ?? 'Student'),
        email: String(u.email ?? ''),
        phone: String(u.phone ?? ''),
        role: String(u.role ?? 'customer'),
        createdAt: String(u.created_at ?? new Date().toISOString()),
        mcqAttempts: this._mcqAttempts.filter((a) => a.userId === uidStr),
        liveTestSubmissions: this._liveTestSubmissions.filter((s) => s.userId === uidStr),
        bookmarkCount: this._bookmarksByUser[uidStr]?.size ?? 0,
      };
    });
  }
}

export const LmsAdminService = new LmsAdminServiceClass();
