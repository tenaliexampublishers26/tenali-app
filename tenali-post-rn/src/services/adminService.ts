import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConstants } from '../core/constants';
import { DataSync } from '../core/utils/dataSync';
import {
  AdminAuditLog,
  Chapter,
  Exam,
  LiveTest,
  LiveTestSubmission,
  Question,
  StudentRecord,
  StudyNote,
  VideoFolder,
  VideoLesson,
  isLiveTestOngoing,
  videoFolderFromJson,
  videoLessonFromJson,
} from '../models';
import { AuthService } from './authService';
import { MockData } from './mockData';
import { SupabaseService } from './supabaseService';

const VIDEO_FOLDERS_STORAGE_KEY = 'tenali_post_video_folders_v1';
const VIDEOS_STORAGE_KEY = 'tenali_post_videos_v1';
const ADMIN_CORE_STORAGE_KEY = 'tenali_post_admin_core_v1';

export interface RowValidationError {
  rowIndex: number;
  field: string;
  message: string;
  rowData: Record<string, string>;
}

export interface ImportValidationResult {
  validQuestions: Question[];
  errors: RowValidationError[];
  totalRows: number;
  duplicateCount: number;
}

export interface AdminStats {
  totalExams: number;
  totalChapters: number;
  totalQuestions: number;
  activeLiveTests: number;
  totalStudents: number;
  totalSubmissions: number;
  translationCoveragePercent: number;
}

class AdminServiceClass {
  private _exams: Exam[] = [...MockData.exams];
  private _chapters: Chapter[] = [...MockData.chapters];
  private _questions: Question[] = [...MockData.sampleQuestions];
  private _liveTests: LiveTest[] = [...MockData.liveTests];
  private _videoFolders: VideoFolder[] = [];
  private _videos: VideoLesson[] = [...MockData.videoLessons];
  private _videosHydrated = false;
  private _coreHydrated = false;
  private _notes: StudyNote[] = [...MockData.studyNotes];
  private _students: StudentRecord[] = [];
  private _auditLogs: AdminAuditLog[] = [];
  private _submissions: LiveTestSubmission[] = [];

  private async _hydrateCoreStore(): Promise<void> {
    if (this._coreHydrated) return;
    this._coreHydrated = true;
    try {
      const raw = await AsyncStorage.getItem(ADMIN_CORE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.exams)) this._exams = parsed.exams;
      if (Array.isArray(parsed.chapters)) this._chapters = parsed.chapters;
      if (Array.isArray(parsed.questions)) this._questions = parsed.questions;
      if (Array.isArray(parsed.liveTests)) this._liveTests = parsed.liveTests;
      if (Array.isArray(parsed.notes)) this._notes = parsed.notes;
      if (Array.isArray(parsed.students)) this._students = parsed.students;
      if (Array.isArray(parsed.auditLogs)) this._auditLogs = parsed.auditLogs;
    } catch (e) {
      console.warn('[AdminService] Core store hydration notice:', e);
    }
  }

  private async _persistCoreStore(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ADMIN_CORE_STORAGE_KEY,
        JSON.stringify({
          exams: this._exams,
          chapters: this._chapters,
          questions: this._questions,
          liveTests: this._liveTests,
          notes: this._notes,
          students: this._students,
          auditLogs: this._auditLogs.slice(0, 100),
        })
      );
    } catch (e) {
      console.warn('[AdminService] Core store persist notice:', e);
    }
  }

  async getAdminStats(): Promise<AdminStats> {
    await this._hydrateCoreStore();
    const totalQ = this._questions.length;
    const teCount = this._questions.filter((q) => q.languageCode === 'te').length;
    const hiCount = this._questions.filter((q) => q.languageCode === 'hi').length;
    const enCount = this._questions.filter((q) => q.languageCode === 'en').length;

    let coverage = enCount > 0 ? ((teCount + hiCount) / (enCount * 2)) * 100 : 0;
    if (coverage > 100) coverage = 100;

    return {
      totalExams: this._exams.length,
      totalChapters: this._chapters.length,
      totalQuestions: totalQ,
      activeLiveTests: this._liveTests.filter(isLiveTestOngoing).length,
      totalStudents: this._students.length,
      totalSubmissions: this._submissions.length,
      translationCoveragePercent: Number(coverage.toFixed(1)),
    };
  }

  async getQuestions(filters?: {
    examId?: string;
    chapterId?: string;
    languageCode?: string;
    difficulty?: string;
    isPublished?: boolean;
    searchQuery?: string;
  }): Promise<Question[]> {
    await this._hydrateCoreStore();
    return this._questions.filter((q) => {
      if (filters?.examId && q.examId !== filters.examId) return false;
      if (filters?.chapterId && q.chapterId !== filters.chapterId) return false;
      if (filters?.languageCode && filters.languageCode !== 'all' && q.languageCode !== filters.languageCode)
        return false;
      if (
        filters?.difficulty &&
        filters.difficulty !== 'all' &&
        q.difficulty.toLowerCase() !== filters.difficulty.toLowerCase()
      )
        return false;
      if (filters?.isPublished !== undefined && q.isPublished !== filters.isPublished)
        return false;
      if (filters?.searchQuery?.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchText = q.questionText.toLowerCase().includes(query);
        const matchRule = (q.postalRuleRef ?? '').toLowerCase().includes(query);
        const matchOpt =
          q.optionA.toLowerCase().includes(query) || q.optionB.toLowerCase().includes(query);
        if (!matchText && !matchRule && !matchOpt) return false;
      }
      return true;
    });
  }

  async saveQuestion(
    question: Question,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    const idx = this._questions.findIndex((q) => q.id === question.id);
    const isUpdate = idx !== -1;
    if (isUpdate) {
      this._questions[idx] = question;
      const mIdx = MockData.sampleQuestions.findIndex((q) => q.id === question.id);
      if (mIdx !== -1) MockData.sampleQuestions[mIdx] = question;
    } else {
      this._questions.unshift(question);
      MockData.sampleQuestions.unshift(question);
    }

    await this.recordAuditLog({
      adminEmail,
      actionType: isUpdate ? 'UPDATE' : 'CREATE',
      targetEntity: 'QUESTION',
      targetId: question.id,
      description: `${isUpdate ? 'Updated' : 'Created'} question: "${question.questionText.slice(0, 40)}..." (${question.languageCode.toUpperCase()})`,
    });
    await this._persistCoreStore();
    DataSync.emit('mcq');
  }

  async deleteQuestion(
    questionId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    this._questions = this._questions.filter((q) => q.id !== questionId);
    MockData.sampleQuestions = MockData.sampleQuestions.filter((q) => q.id !== questionId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'QUESTION',
      targetId: questionId,
      description: `Deleted question ID: ${questionId}`,
    });
    await this._persistCoreStore();
    DataSync.emit('mcq');
  }

  async duplicateQuestion(
    questionId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<Question> {
    const original = this._questions.find((q) => q.id === questionId);
    if (!original) throw new Error('Question not found');
    const duplicated: Question = {
      ...original,
      id: `${original.id}_copy_${Date.now()}`,
      questionText: `${original.questionText} (Copy)`,
      questionNumber: original.questionNumber + 1,
      isPublished: false,
    };
    await this.saveQuestion(duplicated, adminEmail);
    return duplicated;
  }

  async toggleQuestionStatus(
    questionId: string,
    isPublished: boolean,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    const found = this._questions.find((q) => q.id === questionId);
    if (found) {
      await this.saveQuestion({ ...found, isPublished }, adminEmail);
    }
  }

  async getExams(): Promise<Exam[]> {
    await this._hydrateCoreStore();
    return this._exams.map((ex) => {
      const chCount = this._chapters.filter((c) => c.examId === ex.id).length;
      const qCount = this._questions.filter((q) => q.examId === ex.id).length;
      return { ...ex, totalChapters: chCount, totalQuestions: qCount };
    });
  }

  async saveExam(exam: Exam, adminEmail = AppConstants.authorizedAdminEmail): Promise<void> {
    await this._hydrateCoreStore();
    const idx = this._exams.findIndex((e) => e.id === exam.id);
    if (idx !== -1) this._exams[idx] = exam;
    else this._exams.push(exam);
    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'EXAM',
      targetId: exam.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Exam: ${exam.title} (${exam.code})`,
    });
    await this._persistCoreStore();
    DataSync.emit('exams');
  }

  async deleteExam(examId: string, adminEmail = AppConstants.authorizedAdminEmail): Promise<void> {
    await this._hydrateCoreStore();
    const qCount = this._questions.filter((q) => q.examId === examId).length;
    const cCount = this._chapters.filter((c) => c.examId === examId).length;
    if (qCount > 0 || cCount > 0) {
      throw new Error(
        `Cannot delete Exam "${examId}": It still contains ${cCount} chapters and ${qCount} questions.`
      );
    }
    this._exams = this._exams.filter((e) => e.id !== examId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'EXAM',
      targetId: examId,
      description: `Deleted Exam: ${examId}`,
    });
    await this._persistCoreStore();
    DataSync.emit('exams');
  }

  async getChapters(examId?: string): Promise<Chapter[]> {
    await this._hydrateCoreStore();
    const list = examId ? this._chapters.filter((c) => c.examId === examId) : [...this._chapters];
    return list.map((ch) => ({
      ...ch,
      totalQuestions: this._questions.filter((q) => q.chapterId === ch.id).length,
    }));
  }

  async saveChapter(
    chapter: Chapter,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    const idx = this._chapters.findIndex((c) => c.id === chapter.id);
    if (idx !== -1) this._chapters[idx] = chapter;
    else this._chapters.push(chapter);
    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'CHAPTER',
      targetId: chapter.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Chapter: ${chapter.title}`,
    });
    await this._persistCoreStore();
    DataSync.emit('mcq');
  }

  async deleteChapter(
    chapterId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    const qCount = this._questions.filter((q) => q.chapterId === chapterId).length;
    if (qCount > 0) {
      throw new Error(
        `Cannot delete chapter "${chapterId}": It has ${qCount} questions linked.`
      );
    }
    this._chapters = this._chapters.filter((c) => c.id !== chapterId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'CHAPTER',
      targetId: chapterId,
      description: `Deleted Chapter: ${chapterId}`,
    });
    await this._persistCoreStore();
    DataSync.emit('mcq');
  }

  private get _hasLiveAuthSession(): boolean {
    const c = SupabaseService.client;
    return c !== null && !AuthService.isLocalSession;
  }

  private async _hydrateVideoStore(): Promise<void> {
    if (this._videosHydrated) return;
    this._videosHydrated = true;
    try {
      const [rawFolders, rawVideos] = await Promise.all([
        AsyncStorage.getItem(VIDEO_FOLDERS_STORAGE_KEY),
        AsyncStorage.getItem(VIDEOS_STORAGE_KEY),
      ]);
      if (rawFolders) {
        const parsed = JSON.parse(rawFolders);
        if (Array.isArray(parsed)) this._videoFolders = parsed.map(videoFolderFromJson);
      }
      if (rawVideos) {
        const parsed = JSON.parse(rawVideos);
        if (Array.isArray(parsed)) this._videos = parsed.map(videoLessonFromJson);
      }
    } catch (e) {
      console.warn('[AdminService] Local video store hydration notice:', e);
    }
  }

  private async _persistVideoStore(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(VIDEO_FOLDERS_STORAGE_KEY, JSON.stringify(this._videoFolders)),
        AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(this._videos)),
      ]);
    } catch (e) {
      console.warn('[AdminService] Local video store persist notice:', e);
    }
  }

  async getVideoFolders(examId?: string): Promise<VideoFolder[]> {
    await this._hydrateVideoStore();
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        let query = SupabaseService.client
          .from('video_folders')
          .select('*')
          .order('display_order', { ascending: true });
        if (examId) query = query.eq('exam_id', examId);
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const remote = data.map(videoFolderFromJson);
          if (!examId) {
            this._videoFolders = remote;
            await this._persistVideoStore();
          }
          return remote;
        }
      } catch (e) {
        console.warn('[AdminService] Remote video_folders query notice:', e);
      }
    }
    const list = examId
      ? this._videoFolders.filter((f) => f.examId === examId)
      : [...this._videoFolders];
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async saveVideoFolder(
    folder: VideoFolder,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateVideoStore();
    const idx = this._videoFolders.findIndex((f) => f.id === folder.id);
    if (idx !== -1) this._videoFolders[idx] = folder;
    else this._videoFolders.push(folder);
    await this._persistVideoStore();

    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        await SupabaseService.client.from('video_folders').upsert({
          id: folder.id,
          exam_id: folder.examId,
          name: folder.name,
          description: folder.description ?? null,
          display_order: folder.displayOrder,
        });
      } catch (e) {
        console.warn('[AdminService] Remote video_folder upsert notice:', e);
      }
    }

    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'VIDEO_FOLDER',
      targetId: folder.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Video Topic Folder: ${folder.name}`,
    });
    DataSync.emit('videos');
  }

  async deleteVideoFolder(
    folderId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateVideoStore();
    this._videoFolders = this._videoFolders.filter((f) => f.id !== folderId);
    this._videos = this._videos.map((v) =>
      v.folderId === folderId ? { ...v, folderId: null } : v
    );
    await this._persistVideoStore();

    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        await SupabaseService.client.from('video_folders').delete().eq('id', folderId);
      } catch (e) {
        console.warn('[AdminService] Remote video_folder delete notice:', e);
      }
    }

    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'VIDEO_FOLDER',
      targetId: folderId,
      description: `Deleted Video Topic Folder ID: ${folderId}`,
    });
    DataSync.emit('videos');
  }

  async getVideos(examId?: string): Promise<VideoLesson[]> {
    await this._hydrateVideoStore();
    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        let query = SupabaseService.client
          .from('videos')
          .select('*')
          .order('display_order', { ascending: true });
        if (examId) query = query.eq('exam_id', examId);
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          const remote = data.map(videoLessonFromJson);
          if (!examId) {
            this._videos = remote;
            await this._persistVideoStore();
          }
          return remote;
        }
      } catch (e) {
        console.warn('[AdminService] Remote videos query notice:', e);
      }
    }
    const list = examId ? this._videos.filter((v) => v.examId === examId) : [...this._videos];
    return list.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }

  async saveVideo(
    video: VideoLesson,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateVideoStore();
    const idx = this._videos.findIndex((v) => v.id === video.id);
    if (idx !== -1) this._videos[idx] = video;
    else this._videos.push(video);
    await this._persistVideoStore();

    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        await SupabaseService.client.from('videos').upsert({
          id: video.id,
          title: video.title,
          description: video.description,
          youtube_url: video.videoUrl,
          exam_id: video.examId,
          folder_id: video.folderId ?? null,
          chapter_id: video.chapterId ?? null,
          thumbnail_url: video.thumbnailUrl ?? null,
          duration: video.duration,
          language: video.languageCode,
          display_order: video.displayOrder ?? 0,
          is_published: true,
        });
      } catch (e) {
        console.warn('[AdminService] Remote video upsert notice:', e);
      }
    }

    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'VIDEO',
      targetId: video.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Video: ${video.title}`,
    });
    DataSync.emit('videos');
  }

  async saveVideosBatch(
    videos: VideoLesson[],
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateVideoStore();
    for (const video of videos) {
      const idx = this._videos.findIndex((v) => v.id === video.id);
      if (idx !== -1) this._videos[idx] = video;
      else this._videos.push(video);
    }
    await this._persistVideoStore();

    if (this._hasLiveAuthSession && SupabaseService.client && videos.length > 0) {
      try {
        await SupabaseService.client.from('videos').upsert(
          videos.map((v) => ({
            id: v.id,
            title: v.title,
            description: v.description,
            youtube_url: v.videoUrl,
            exam_id: v.examId,
            folder_id: v.folderId ?? null,
            chapter_id: v.chapterId ?? null,
            thumbnail_url: v.thumbnailUrl ?? null,
            duration: v.duration,
            language: v.languageCode,
            display_order: v.displayOrder ?? 0,
            is_published: true,
          }))
        );
      } catch (e) {
        console.warn('[AdminService] Remote batch video upsert notice:', e);
      }
    }

    await this.recordAuditLog({
      adminEmail,
      actionType: 'IMPORT',
      targetEntity: 'VIDEO',
      targetId: `batch-${videos.length}`,
      description: `Imported ${videos.length} YouTube video lessons`,
    });
    DataSync.emit('videos');
  }

  async deleteVideo(
    videoId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateVideoStore();
    this._videos = this._videos.filter((v) => v.id !== videoId);
    await this._persistVideoStore();

    if (this._hasLiveAuthSession && SupabaseService.client) {
      try {
        await SupabaseService.client.from('videos').delete().eq('id', videoId);
      } catch (e) {
        console.warn('[AdminService] Remote video delete notice:', e);
      }
    }

    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'VIDEO',
      targetId: videoId,
      description: `Deleted Video ID: ${videoId}`,
    });
    DataSync.emit('videos');
  }

  async getNotes(examId?: string): Promise<StudyNote[]> {
    await this._hydrateCoreStore();
    if (examId) return this._notes.filter((n) => n.examId === examId);
    return [...this._notes];
  }

  async saveNote(
    note: StudyNote,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    const idx = this._notes.findIndex((n) => n.id === note.id);
    if (idx !== -1) this._notes[idx] = note;
    else this._notes.push(note);
    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'NOTE',
      targetId: note.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Study Note: ${note.title}`,
    });
    await this._persistCoreStore();
    DataSync.emit('notes');
  }

  async deleteNote(
    noteId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    this._notes = this._notes.filter((n) => n.id !== noteId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'NOTE',
      targetId: noteId,
      description: `Deleted Note ID: ${noteId}`,
    });
    await this._persistCoreStore();
    DataSync.emit('notes');
  }

  async getLiveTests(): Promise<LiveTest[]> {
    await this._hydrateCoreStore();
    return [...this._liveTests];
  }

  async saveLiveTest(
    test: LiveTest,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    const idx = this._liveTests.findIndex((t) => t.id === test.id);
    if (idx !== -1) this._liveTests[idx] = test;
    else this._liveTests.push(test);
    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'LIVE_TEST',
      targetId: test.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Live Test: ${test.title}`,
    });
    await this._persistCoreStore();
    DataSync.emit('liveTests');
  }

  async deleteLiveTest(
    testId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    await this._hydrateCoreStore();
    this._liveTests = this._liveTests.filter((t) => t.id !== testId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'LIVE_TEST',
      targetId: testId,
      description: `Deleted Live Test ID: ${testId}`,
    });
    await this._persistCoreStore();
    DataSync.emit('liveTests');
  }

  async getTestSubmissions(testId: string): Promise<LiveTestSubmission[]> {
    return this._submissions.filter((s) => s.testId === testId);
  }

  async getStudents(filters?: {
    searchQuery?: string;
    circle?: string;
    status?: string;
  }): Promise<StudentRecord[]> {
    await this._hydrateCoreStore();
    return this._students.filter((s) => {
      if (filters?.circle && filters.circle !== 'All Circles' && s.postalCircle !== filters.circle)
        return false;
      if (filters?.status && filters.status !== 'All Status' && s.status !== filters.status)
        return false;
      if (filters?.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        if (
          !s.fullName.toLowerCase().includes(q) &&
          !s.email.toLowerCase().includes(q) &&
          !s.phoneNumber.includes(q)
        )
          return false;
      }
      return true;
    });
  }

  async toggleStudentStatus(
    studentId: string,
    newStatus: 'Active' | 'Suspended',
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    const idx = this._students.findIndex((s) => s.id === studentId);
    if (idx !== -1) {
      this._students[idx] = { ...this._students[idx], status: newStatus };
      await this.recordAuditLog({
        adminEmail,
        actionType: newStatus === 'Suspended' ? 'SUSPEND' : 'ACTIVATE',
        targetEntity: 'STUDENT',
        targetId: studentId,
        description: `Changed student ${this._students[idx].fullName} status to ${newStatus}`,
      });
    }
  }

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    await this._hydrateCoreStore();
    return [...this._auditLogs];
  }

  async recordAuditLog(params: {
    adminEmail: string;
    actionType: string;
    targetEntity: string;
    targetId: string;
    description: string;
  }): Promise<void> {
    this._auditLogs.unshift({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminEmail: params.adminEmail,
      actionType: params.actionType,
      targetEntity: params.targetEntity,
      targetId: params.targetId,
      description: params.description,
      timestamp: new Date().toISOString(),
    });
  }
}

export const AdminService = new AdminServiceClass();
