import {
  Chapter,
  chapterFromJson,
  Exam,
  examFromJson,
  LiveTest,
  liveTestFromJson,
  LiveTestSubmission,
  Question,
  questionFromJson,
  StudyNote,
  studyNoteFromJson,
  VideoFolder,
  videoFolderFromJson,
  VideoLesson,
  videoLessonFromJson,
} from '../models';
import { AdminService } from './adminService';
import { AuthService } from './authService';
import { LmsAdminService } from './lmsAdminService';
import { SupabaseService } from './supabaseService';

class DataServiceClass {
  private get _useRemoteSupabase(): boolean {
    return (
      SupabaseService.isInitialized &&
      SupabaseService.client !== null &&
      !AuthService.isLocalSession
    );
  }

  async getExams(): Promise<Exam[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('exams')
          .select()
          .order('created_at');
        if (!error && Array.isArray(data)) {
          return data.map(examFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Exams query notice:', e);
      }
    }

    const [adminExams, lmsTopics] = await Promise.all([
      AdminService.getExams(),
      LmsAdminService.getTopics(true),
    ]);

    const topicAsExams: Exam[] = lmsTopics
      .filter((t) => !adminExams.some((e) => e.id === t.id))
      .map((t) => ({
        id: t.id,
        title: t.name,
        subtitle: t.description || t.category || 'Departmental MCQ Topic',
        code: 'TOPIC',
        totalChapters: t.chapterCount,
        totalQuestions: t.questionCount,
        iconName: 'school',
      }));

    return [...adminExams, ...topicAsExams];
  }

  async getChapters(examId: string): Promise<Chapter[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('chapters')
          .select()
          .eq('exam_id', examId)
          .order('chapter_number');
        if (!error && Array.isArray(data)) {
          return data.map(chapterFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Chapters query notice:', e);
      }
    }

    const [adminChapters, lmsChapters] = await Promise.all([
      AdminService.getChapters(examId),
      LmsAdminService.getChapters(examId, true),
    ]);

    const mappedLmsChapters: Chapter[] = lmsChapters.map((c) => ({
      id: c.id,
      examId: c.topicId,
      title: c.title,
      description: c.description ?? null,
      chapterNumber: c.displayOrder,
      totalQuestions: c.questionCount,
      supportedLanguages: ['en', 'te', 'hi'],
    }));

    return [...adminChapters, ...mappedLmsChapters];
  }

  async getPracticeQuestions(
    chapterId: string,
    languageCode: string
  ): Promise<Question[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('questions')
          .select()
          .eq('chapter_id', chapterId)
          .eq('language_code', languageCode)
          .order('question_number');
        if (!error && Array.isArray(data)) {
          return data.map(questionFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Questions query notice:', e);
      }
    }

    const [adminQuestions, lmsQuestions] = await Promise.all([
      AdminService.getQuestions({ chapterId, languageCode, isPublished: true }),
      LmsAdminService.getPublishedQuestionsForChapter(chapterId, languageCode),
    ]);

    const mappedLms: Question[] = lmsQuestions.map((q, idx) => ({
      id: q.id,
      chapterId: q.chapterId ?? chapterId,
      examId: '',
      languageCode: q.language,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation ?? null,
      postalRuleRef: null,
      questionNumber: q.displayOrder || idx + 1,
      difficulty: q.difficulty || 'Medium',
      isPublished: true,
    }));

    return [...adminQuestions, ...mappedLms];
  }

  async getLiveTests(): Promise<LiveTest[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('live_tests')
          .select()
          .eq('is_published', true)
          .order('start_time', { ascending: false });
        if (!error && Array.isArray(data)) {
          return data.map(liveTestFromJson);
        }
      } catch (e) {
        console.warn('[DataService] LiveTests query notice:', e);
      }
    }

    const [adminTests, lmsTests] = await Promise.all([
      AdminService.getLiveTests(),
      LmsAdminService.getLiveTests(),
    ]);

    const publishedLmsTests: LiveTest[] = lmsTests
      .filter((t) => t.status === 'published')
      .map((t) => {
        const start = new Date(t.testDate || t.createdAt);
        const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          examId: 'mts',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: 60,
          totalMarks: t.questionCount || 0,
          totalQuestions: t.questionCount || 0,
          passMarks: Math.ceil((t.questionCount || 0) * 0.4),
          negativeMarksPerWrong: 0,
          isPublished: true,
          isResultsPublished: t.answersReleased,
        };
      });

    return [...publishedLmsTests, ...adminTests.filter((t) => t.isPublished)];
  }

  async getLiveTestQuestions(testId: string): Promise<Question[]> {
    const lmsQs = await LmsAdminService.getLiveTestQuestions(testId);
    if (lmsQs.length > 0) {
      return lmsQs.map((q, idx) => ({
        id: q.id,
        chapterId: testId,
        examId: 'mts',
        languageCode: 'en',
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: null,
        explanation: null,
        postalRuleRef: null,
        questionNumber: q.displayOrder || idx + 1,
        difficulty: 'Medium',
        isPublished: true,
      }));
    }

    const adminQs = await AdminService.getQuestions({ isPublished: true });
    return adminQs.map((q) => ({
      ...q,
      correctOption: null,
      explanation: null,
    }));
  }

  async submitLiveTest(params: {
    testId: string;
    studentName: string;
    phoneNumber: string;
    answers: Record<string, string>;
  }): Promise<LiveTestSubmission> {
    const lmsQs = await LmsAdminService.getLiveTestQuestions(params.testId);
    const sourceQs =
      lmsQs.length > 0
        ? lmsQs.map((q) => ({ id: q.id, correctOption: q.correctOption }))
        : (await AdminService.getQuestions({ isPublished: true })).map((q) => ({
            id: q.id,
            correctOption: q.correctOption,
          }));

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    for (const q of sourceQs) {
      const chosen = params.answers[q.id]?.toUpperCase();
      if (chosen) {
        if (chosen === q.correctOption?.toUpperCase()) correct++;
        else wrong++;
      } else {
        skipped++;
      }
    }

    const marks = correct * 1.0;
    const totalMarks = sourceQs.length * 1.0;
    const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0.0;

    const submission: LiveTestSubmission = {
      id: `sub-${Date.now()}`,
      testId: params.testId,
      studentName: params.studentName,
      phoneNumber: params.phoneNumber,
      marksObtained: marks,
      totalMarks,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      percentage,
      rank: 1,
      answers: params.answers,
      submittedAt: new Date().toISOString(),
    };

    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        await SupabaseService.client.from('live_test_submissions').insert({
          id: submission.id,
          test_id: submission.testId,
          student_name: submission.studentName,
          phone_number: submission.phoneNumber,
          marks_obtained: submission.marksObtained,
          total_marks: submission.totalMarks,
          correct_count: submission.correctCount,
          wrong_count: submission.wrongCount,
          skipped_count: submission.skippedCount,
          percentage: submission.percentage,
          rank: submission.rank,
          answers: submission.answers,
          submitted_at: submission.submittedAt,
        });
      } catch (e) {
        console.warn('[DataService] Remote submission notice:', e);
      }
    }

    return submission;
  }

  async getVideoFolders(examId: string): Promise<VideoFolder[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('video_folders')
          .select()
          .eq('exam_id', examId)
          .order('display_order', { ascending: true });
        if (!error && Array.isArray(data)) {
          return data.map(videoFolderFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Video folders query notice:', e);
      }
    }
    return AdminService.getVideoFolders(examId);
  }

  async getVideos(examId: string): Promise<VideoLesson[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('videos')
          .select()
          .eq('exam_id', examId)
          .eq('is_published', true)
          .order('display_order', { ascending: true });
        if (!error && Array.isArray(data)) {
          return data.map(videoLessonFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Videos query notice:', e);
      }
    }
    return AdminService.getVideos(examId);
  }

  async getNotes(examId: string): Promise<StudyNote[]> {
    if (this._useRemoteSupabase && SupabaseService.client) {
      try {
        const { data, error } = await SupabaseService.client
          .from('notes')
          .select()
          .eq('exam_id', examId);
        if (!error && Array.isArray(data)) {
          return data.map(studyNoteFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Notes query notice:', e);
      }
    }
    return AdminService.getNotes(examId);
  }
}

export const DataService = new DataServiceClass();
