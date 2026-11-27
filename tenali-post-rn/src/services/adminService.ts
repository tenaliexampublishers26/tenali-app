import { AppConstants } from '../core/constants';
import {
  AdminAuditLog,
  Chapter,
  Exam,
  LiveTest,
  LiveTestSubmission,
  Question,
  StudentRecord,
  StudyNote,
  VideoLesson,
  isLiveTestOngoing,
} from '../models';
import { MockData } from './mockData';

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
  private _videos: VideoLesson[] = [...MockData.videoLessons];
  private _notes: StudyNote[] = [...MockData.studyNotes];
  private _students: StudentRecord[] = [
    {
      id: 'stu-01',
      email: 'srikanth.verma@postal.gov.in',
      fullName: 'Srikanth Verma',
      phoneNumber: '+91 98765 43210',
      postalCircle: 'Andhra Pradesh Circle',
      targetExam: 'MTS Examination',
      status: 'Active',
      registeredAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      totalTestsAttempted: 0,
      averagePercentage: 0,
      testAttempts: [],
    },
    {
      id: 'stu-02',
      email: 'priya.sharma@postal.gov.in',
      fullName: 'Priya Sharma',
      phoneNumber: '+91 98111 22334',
      postalCircle: 'Telangana Circle',
      targetExam: 'Postman & Mail Guard',
      status: 'Active',
      registeredAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      totalTestsAttempted: 3,
      averagePercentage: 86.0,
      testAttempts: [],
    },
    {
      id: 'stu-03',
      email: 'rajesh.kumar@postal.gov.in',
      fullName: 'Rajesh Kumar',
      phoneNumber: '+91 97222 33445',
      postalCircle: 'Karnataka Circle',
      targetExam: 'PA / SA Examination',
      status: 'Active',
      registeredAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      totalTestsAttempted: 5,
      averagePercentage: 79.4,
      testAttempts: [],
    },
    {
      id: 'stu-04',
      email: 'ananya.reddy@postal.gov.in',
      fullName: 'Ananya Reddy',
      phoneNumber: '+91 96333 44556',
      postalCircle: 'Andhra Pradesh Circle',
      targetExam: 'LGO Examination',
      status: 'Suspended',
      registeredAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      totalTestsAttempted: 1,
      averagePercentage: 45.0,
      testAttempts: [],
    },
    {
      id: 'stu-05',
      email: 'manoj.patel@postal.gov.in',
      fullName: 'Manoj Patel',
      phoneNumber: '+91 95444 55667',
      postalCircle: 'Maharashtra Circle',
      targetExam: 'MTS Examination',
      status: 'Active',
      registeredAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 1800000).toISOString(),
      totalTestsAttempted: 2,
      averagePercentage: 88.0,
      testAttempts: [],
    },
  ];
  private _auditLogs: AdminAuditLog[] = [
    {
      id: 'log-01',
      adminEmail: AppConstants.authorizedAdminEmail,
      actionType: 'SYSTEM_INIT',
      targetEntity: 'SYSTEM',
      targetId: 'tenali-post-admin',
      description: 'Tenali Post Production Admin Management Console initialized.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
  private _submissions: LiveTestSubmission[] = [];

  async getAdminStats(): Promise<AdminStats> {
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
  }

  async deleteQuestion(
    questionId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    this._questions = this._questions.filter((q) => q.id !== questionId);
    MockData.sampleQuestions = MockData.sampleQuestions.filter((q) => q.id !== questionId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'QUESTION',
      targetId: questionId,
      description: `Deleted question ID: ${questionId}`,
    });
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
    return [...this._exams];
  }

  async saveExam(exam: Exam, adminEmail = AppConstants.authorizedAdminEmail): Promise<void> {
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
  }

  async deleteExam(examId: string, adminEmail = AppConstants.authorizedAdminEmail): Promise<void> {
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
  }

  async getChapters(examId?: string): Promise<Chapter[]> {
    if (examId) return this._chapters.filter((c) => c.examId === examId);
    return [...this._chapters];
  }

  async saveChapter(
    chapter: Chapter,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
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
  }

  async deleteChapter(
    chapterId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
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
  }

  async getVideos(examId?: string): Promise<VideoLesson[]> {
    if (examId) return this._videos.filter((v) => v.examId === examId);
    return [...this._videos];
  }

  async saveVideo(
    video: VideoLesson,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    const idx = this._videos.findIndex((v) => v.id === video.id);
    if (idx !== -1) this._videos[idx] = video;
    else this._videos.push(video);
    await this.recordAuditLog({
      adminEmail,
      actionType: idx !== -1 ? 'UPDATE' : 'CREATE',
      targetEntity: 'VIDEO',
      targetId: video.id,
      description: `${idx !== -1 ? 'Updated' : 'Created'} Video: ${video.title}`,
    });
  }

  async deleteVideo(
    videoId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    this._videos = this._videos.filter((v) => v.id !== videoId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'VIDEO',
      targetId: videoId,
      description: `Deleted Video ID: ${videoId}`,
    });
  }

  async getNotes(examId?: string): Promise<StudyNote[]> {
    if (examId) return this._notes.filter((n) => n.examId === examId);
    return [...this._notes];
  }

  async saveNote(
    note: StudyNote,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
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
  }

  async deleteNote(
    noteId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    this._notes = this._notes.filter((n) => n.id !== noteId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'NOTE',
      targetId: noteId,
      description: `Deleted Note ID: ${noteId}`,
    });
  }

  async getLiveTests(): Promise<LiveTest[]> {
    return [...this._liveTests];
  }

  async saveLiveTest(
    test: LiveTest,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
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
  }

  async deleteLiveTest(
    testId: string,
    adminEmail = AppConstants.authorizedAdminEmail
  ): Promise<void> {
    this._liveTests = this._liveTests.filter((t) => t.id !== testId);
    await this.recordAuditLog({
      adminEmail,
      actionType: 'DELETE',
      targetEntity: 'LIVE_TEST',
      targetId: testId,
      description: `Deleted Live Test ID: ${testId}`,
    });
  }

  async getTestSubmissions(testId: string): Promise<LiveTestSubmission[]> {
    return this._submissions.filter((s) => s.testId === testId);
  }

  async getStudents(filters?: {
    searchQuery?: string;
    circle?: string;
    status?: string;
  }): Promise<StudentRecord[]> {
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
