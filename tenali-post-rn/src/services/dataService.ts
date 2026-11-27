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
  VideoLesson,
  videoLessonFromJson,
} from '../models';
import { MockData } from './mockData';
import { SupabaseService } from './supabaseService';

class DataServiceClass {
  async getExams(): Promise<Exam[]> {
    if (SupabaseService.isInitialized && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client
          .from('exams')
          .select()
          .order('created_at');
        if (data && data.length > 0) {
          return data.map(examFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Exams query notice:', e);
      }
    }
    return MockData.exams;
  }

  async getChapters(examId: string): Promise<Chapter[]> {
    if (SupabaseService.isInitialized && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client
          .from('chapters')
          .select()
          .eq('exam_id', examId)
          .order('chapter_number');
        if (data && data.length > 0) {
          return data.map(chapterFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Chapters query notice:', e);
      }
    }
    return MockData.chapters.filter((c) => c.examId === examId);
  }

  async getPracticeQuestions(
    chapterId: string,
    languageCode: string
  ): Promise<Question[]> {
    if (SupabaseService.isInitialized && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client
          .from('questions')
          .select()
          .eq('chapter_id', chapterId)
          .eq('language_code', languageCode)
          .order('question_number');
        if (data && data.length > 0) {
          return data.map(questionFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Questions query notice:', e);
      }
    }
    return MockData.sampleQuestions.filter(
      (q) => q.chapterId === chapterId && q.languageCode === languageCode
    );
  }

  async getLiveTests(): Promise<LiveTest[]> {
    if (SupabaseService.isInitialized && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client
          .from('live_tests')
          .select()
          .eq('is_published', true)
          .order('start_time', { ascending: false });
        if (data && data.length > 0) {
          return data.map(liveTestFromJson);
        }
      } catch (e) {
        console.warn('[DataService] LiveTests query notice:', e);
      }
    }
    return MockData.liveTests;
  }

  async getLiveTestQuestions(_testId: string): Promise<Question[]> {
    return MockData.sampleQuestions.map((q) => ({
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
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    for (const q of MockData.sampleQuestions) {
      const chosen = params.answers[q.id]?.toUpperCase();
      if (chosen) {
        if (chosen === q.correctOption?.toUpperCase()) correct++;
        else wrong++;
      } else {
        skipped++;
      }
    }

    const marks = correct * 1.0;
    const totalMarks = MockData.sampleQuestions.length * 1.0;
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

    if (SupabaseService.isInitialized && SupabaseService.client) {
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

  async getVideos(examId: string): Promise<VideoLesson[]> {
    if (SupabaseService.isInitialized && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client
          .from('videos')
          .select()
          .eq('exam_id', examId);
        if (data && data.length > 0) {
          return data.map(videoLessonFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Videos query notice:', e);
      }
    }
    return MockData.videoLessons.filter((v) => v.examId === examId);
  }

  async getNotes(examId: string): Promise<StudyNote[]> {
    if (SupabaseService.isInitialized && SupabaseService.client) {
      try {
        const { data } = await SupabaseService.client
          .from('notes')
          .select()
          .eq('exam_id', examId);
        if (data && data.length > 0) {
          return data.map(studyNoteFromJson);
        }
      } catch (e) {
        console.warn('[DataService] Notes query notice:', e);
      }
    }
    return MockData.studyNotes.filter((n) => n.examId === examId);
  }
}

export const DataService = new DataServiceClass();
