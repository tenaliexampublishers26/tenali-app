import { AppConstants } from '../core/constants';
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

    this._topics = [
      {
        id: 'topic-po-guide',
        slug: 'post-office-guide-part-1',
        name: 'Post Office Guide Part I',
        category: 'Departmental Rules',
        description: 'Organization, business hours, postage stamps, and inland postal rules.',
        icon: 'book-open',
        displayOrder: 1,
        isPublished: true,
        isActive: true,
        chapterCount: 2,
        questionCount: 2,
      },
      {
        id: 'topic-po-manual',
        slug: 'postal-manual-volume-v',
        name: 'Postal Manual Volume V',
        category: 'Departmental Rules',
        description: 'Definitions, sorting offices, mail bags, and delivery guidelines.',
        icon: 'book-open',
        displayOrder: 2,
        isPublished: true,
        isActive: true,
        chapterCount: 0,
        questionCount: 0,
      },
    ];

    this._chapters = [
      {
        id: 'chap-org',
        topicId: 'topic-po-guide',
        title: 'Chapter 1: Organization & Control',
        slug: 'organization-control',
        displayOrder: 1,
        isPublished: true,
        questionCount: 2,
        publishedSetsCount: 1,
      },
      {
        id: 'chap-mail',
        topicId: 'topic-po-guide',
        title: 'Chapter 2: Inland Mail & Weight Limits',
        slug: 'inland-mail-weight',
        displayOrder: 2,
        isPublished: true,
        questionCount: 0,
        publishedSetsCount: 0,
      },
    ];

    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    this._questionSets = [
      {
        id: 'set-org-en-v1',
        chapterId: 'chap-org',
        mediumId: 'med-en',
        version: 1,
        status: 'published',
        questionCount: 2,
        createdAt: twoDaysAgo,
        publishedAt: twoDaysAgo,
      },
    ];

    this._mcqQuestions = [
      {
        id: 'q-seed-1',
        questionSetId: 'set-org-en-v1',
        chapterId: 'chap-org',
        questionKey: 'Q1',
        questionText: 'Who is the administrative head of a Postal Circle in India Post?',
        optionA: 'Superintendent of Post Offices (SPO)',
        optionB: 'Chief Postmaster General (CPMG)',
        optionC: 'Director General (Posts)',
        optionD: 'Inspector of Posts (IP)',
        correctOption: 'B',
        explanation: 'Each Postal Circle is headed by a Chief Postmaster General (CPMG).',
        language: 'en',
        difficulty: 'medium',
        displayOrder: 1,
        status: 'published',
      },
      {
        id: 'q-seed-2',
        questionSetId: 'set-org-en-v1',
        chapterId: 'chap-org',
        questionKey: 'Q2',
        questionText: 'What is the maximum permissible weight for an Inland Letter Card?',
        optionA: '3 grams',
        optionB: '5 grams',
        optionC: '10 grams',
        optionD: '15 grams',
        correctOption: 'B',
        explanation: 'An Inland Letter Card has a maximum permissible weight limit of 5 grams.',
        language: 'en',
        difficulty: 'medium',
        displayOrder: 2,
        status: 'published',
      },
    ];

    this._liveTests = [
      {
        id: 'lt-demo-1',
        title: 'All-India Postal MTS Weekly Mock Test',
        description: 'Untimed departmental live mock test covering PO Guide Part I.',
        testDate: new Date().toISOString(),
        status: 'published',
        questionCount: 2,
        answersReleased: false,
        attemptsCount: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    this._liveTestQuestions = [
      {
        id: 'ltq-1',
        testId: 'lt-demo-1',
        questionKey: 'Q1',
        questionText: 'Which article of the Indian Constitution deals with the Right to Equality?',
        optionA: 'Article 12',
        optionB: 'Article 14',
        optionC: 'Article 19',
        optionD: 'Article 21',
        correctOption: 'B',
        explanation: 'Article 14 guarantees equality before law and equal protection of laws.',
        displayOrder: 1,
      },
      {
        id: 'ltq-2',
        testId: 'lt-demo-1',
        questionKey: 'Q2',
        questionText: 'How many Postal Circles exist in India Post (excluding APS)?',
        optionA: '21',
        optionB: '22',
        optionC: '23',
        optionD: '24',
        correctOption: 'C',
        explanation: 'India is divided into 23 Postal Circles.',
        displayOrder: 2,
      },
    ];

    this._liveTestSubmissions = [
      {
        id: 'sub-demo-1',
        testId: 'lt-demo-1',
        userId: 'example-student-01',
        studentName: 'Example Candidate',
        phoneNumber: '9876543210',
        location: 'Tenali, AP',
        email: 'student@example.com',
        totalQuestions: 2,
        attemptedCount: 2,
        correctCount: 2,
        wrongCount: 0,
        marksObtained: 2,
        percentage: 100.0,
        answers: { 'ltq-1': 'B', 'ltq-2': 'C' },
        submittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        rank: 1,
      },
    ];

    this._noteFolders = [
      {
        id: 'nf-root-1',
        name: 'PO Guide Part I',
        parentId: null,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'nf-sub-1',
        name: 'Clause Summaries',
        parentId: 'nf-root-1',
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      },
    ];

    this._localUsers = [
      {
        id: 'example-student-01',
        name: 'Example Candidate',
        email: AppConstants.exampleLoginEmail,
        phone: '9876543210',
        role: 'customer',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'stu-02',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '9123456780',
        role: 'customer',
        created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
    ];

    this._auditLogs = [
      {
        id: 'audit-init-1',
        adminId: 'admin-01',
        adminName: 'Tenali Postal Admin',
        adminEmail: AppConstants.authorizedAdminEmail,
        actionType: 'INITIALIZE_LMS',
        targetType: 'settings',
        targetName: 'Global LMS Controls',
        newValue: { mcq_enabled: 'true', live_test_enabled: 'true' },
        ipAddress: 'mobile-app',
        locationName: 'Tenali, Andhra Pradesh, India',
        createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      },
    ];
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
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client.from('settings').select('key, value');
        if (data) {
          this._settings = lmsSettingsFromKeyValueRows(data);
          return this._settings;
        }
      } catch {
        // fallback
      }
    }
    return this._settings;
  }

  async toggleMcqEnabled(enabled: boolean): Promise<void> {
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
  }

  async toggleLiveTestEnabled(enabled: boolean): Promise<void> {
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
  }

  async updateSettings(next: LmsSettings): Promise<void> {
    const prev = { ...this._settings };
    this._settings = next;
    this._recordLocalAudit({
      actionType: 'UPDATE_SETTINGS',
      targetType: 'settings',
      targetName: 'Global LMS Settings',
      previousValue: prev,
      newValue: next,
    });
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
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        let q = SupabaseService.client.from('mcq_topics').select().order('display_order');
        if (publishedOnly) q = q.eq('is_published', true);
        const { data } = await q;
        if (data && data.length > 0) {
          this._topics = data.map(mcqTopicFromJson);
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
    return topic;
  }

  async updateTopic(topic: McqTopic): Promise<void> {
    const idx = this._topics.findIndex((t) => t.id === topic.id);
    if (idx !== -1) this._topics[idx] = topic;
    this._recordLocalAudit({
      actionType: 'UPDATE_TOPIC',
      targetType: 'mcq_topic',
      targetName: topic.name,
    });
  }

  async deleteTopicTree(topicId: string): Promise<void> {
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
  }

  async getChapters(topicId: string, publishedOnly = false): Promise<McqChapter[]> {
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
    return chapter;
  }

  async updateChapter(chapter: McqChapter): Promise<void> {
    const idx = this._chapters.findIndex((c) => c.id === chapter.id);
    if (idx !== -1) this._chapters[idx] = chapter;
  }

  async deleteChapter(chapterId: string): Promise<void> {
    this._mcqQuestions = this._mcqQuestions.filter((q) => q.chapterId !== chapterId);
    this._questionSets = this._questionSets.filter((s) => s.chapterId !== chapterId);
    this._chapters = this._chapters.filter((c) => c.id !== chapterId);
  }

  async getMediums(): Promise<McqMedium[]> {
    return [...this._mediums];
  }

  async createMedium(code: string, displayName: string): Promise<McqMedium> {
    const m: McqMedium = {
      id: `med-${code.toLowerCase()}`,
      code: code.toLowerCase(),
      displayName,
      isActive: true,
    };
    this._mediums.push(m);
    return m;
  }

  async getQuestionSetsForChapter(
    chapterId: string,
    publishedOnly = false
  ): Promise<McqQuestionSet[]> {
    return this._questionSets
      .filter((s) => s.chapterId === chapterId && (!publishedOnly || s.status === 'published'))
      .map((s) => ({
        ...s,
        questionCount: this._mcqQuestions.filter((q) => q.questionSetId === s.id).length,
      }));
  }

  async attachChapterLanguage(chapterId: string, mediumId: string): Promise<McqQuestionSet> {
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
    return set;
  }

  async deleteChapterLanguage(chapterId: string, mediumId: string): Promise<void> {
    const setIds = this._questionSets
      .filter((s) => s.chapterId === chapterId && s.mediumId === mediumId)
      .map((s) => s.id);
    this._mcqQuestions = this._mcqQuestions.filter((q) => !setIds.includes(q.questionSetId));
    this._questionSets = this._questionSets.filter((s) => !setIds.includes(s.id));
  }

  async getQuestionsForSet(setId: string): Promise<LmsMcqQuestion[]> {
    return this._mcqQuestions
      .filter((q) => q.questionSetId === setId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async addMcqQuestion(q: LmsMcqQuestion): Promise<void> {
    this._mcqQuestions.push({ ...q, id: q.id || uid() });
  }

  async updateMcqQuestion(q: LmsMcqQuestion): Promise<void> {
    const idx = this._mcqQuestions.findIndex((x) => x.id === q.id);
    if (idx !== -1) this._mcqQuestions[idx] = q;
  }

  async deleteMcqQuestion(questionId: string, _setId: string): Promise<void> {
    this._mcqQuestions = this._mcqQuestions.filter((q) => q.id !== questionId);
  }

  async clearMcqQuestionSet(setId: string): Promise<void> {
    this._mcqQuestions = this._mcqQuestions.filter((q) => q.questionSetId !== setId);
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
    return targetSet;
  }

  // 3. Live Tests
  async getLiveTests(): Promise<LmsLiveTest[]> {
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
    return t;
  }

  async updateLiveTest(test: LmsLiveTest): Promise<void> {
    const idx = this._liveTests.findIndex((t) => t.id === test.id);
    if (idx !== -1) this._liveTests[idx] = test;
  }

  async deleteLiveTest(testId: string): Promise<void> {
    this._liveTests = this._liveTests.filter((t) => t.id !== testId);
    this._liveTestQuestions = this._liveTestQuestions.filter((q) => q.testId !== testId);
  }

  async getLiveTestQuestions(testId: string): Promise<LmsLiveTestQuestion[]> {
    return this._liveTestQuestions
      .filter((q) => q.testId === testId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async addLiveTestQuestion(q: LmsLiveTestQuestion): Promise<void> {
    this._liveTestQuestions.push({ ...q, id: q.id || uid() });
  }

  async deleteLiveTestQuestion(questionId: string): Promise<void> {
    this._liveTestQuestions = this._liveTestQuestions.filter((q) => q.id !== questionId);
  }

  async getLiveTestSubmissions(testId: string): Promise<LmsLiveTestSubmission[]> {
    return this._liveTestSubmissions
      .filter((s) => s.testId === testId)
      .sort((a, b) => b.marksObtained - a.marksObtained)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));
  }

  // 4. Notes & Folders
  async getNoteFolders(): Promise<NoteFolder[]> {
    return [...this._noteFolders];
  }

  async createNoteFolder(name: string, parentId?: string | null): Promise<NoteFolder> {
    const now = new Date().toISOString();
    const folder: NoteFolder = {
      id: uid(),
      name: name.trim(),
      parentId: parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this._noteFolders.push(folder);
    return folder;
  }

  async deleteNoteFolder(folderId: string): Promise<void> {
    this._noteFolders = this._noteFolders.filter((f) => f.id !== folderId);
    this._pdfMaterials = this._pdfMaterials.map((n) =>
      n.folderId === folderId ? { ...n, folderId: null } : n
    );
  }

  async getNotes(): Promise<PdfMaterial[]> {
    return [...this._pdfMaterials];
  }

  async createPdfMaterial(note: PdfMaterial): Promise<PdfMaterial> {
    const created = { ...note, id: note.id || uid() };
    this._pdfMaterials.unshift(created);
    return created;
  }

  async deletePdfMaterial(noteId: string): Promise<void> {
    this._pdfMaterials = this._pdfMaterials.filter((n) => n.id !== noteId);
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
