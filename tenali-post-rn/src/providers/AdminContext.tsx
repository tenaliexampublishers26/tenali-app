import React, { createContext, useContext, useState } from 'react';
import {
  AdminAuditLog,
  Chapter,
  Exam,
  LiveTest,
  Question,
  StudentRecord,
  StudyNote,
  VideoLesson,
} from '../models';
import { AdminService, AdminStats } from '../services/adminService';

interface AdminContextValue {
  stats: AdminStats | null;
  questions: Question[];
  exams: Exam[];
  chapters: Chapter[];
  students: StudentRecord[];
  liveTests: LiveTest[];
  videos: VideoLesson[];
  notes: StudyNote[];
  auditLogs: AdminAuditLog[];
  isLoading: boolean;
  errorMessage: string | null;
  loadDashboardOverview: () => Promise<void>;
  loadQuestions: (filters?: {
    examId?: string;
    chapterId?: string;
    languageCode?: string;
    difficulty?: string;
    isPublished?: boolean;
    searchQuery?: string;
  }) => Promise<void>;
  saveQuestion: (q: Question, adminEmail: string) => Promise<void>;
  deleteQuestion: (id: string, adminEmail: string) => Promise<void>;
  duplicateQuestion: (id: string, adminEmail: string) => Promise<Question>;
  toggleQuestionStatus: (id: string, pub: boolean, adminEmail: string) => Promise<void>;
  saveExam: (exam: Exam, adminEmail: string) => Promise<void>;
  deleteExam: (id: string, adminEmail: string) => Promise<void>;
  saveChapter: (chapter: Chapter, adminEmail: string) => Promise<void>;
  deleteChapter: (id: string, adminEmail: string) => Promise<void>;
  loadVideos: (examId?: string) => Promise<void>;
  saveVideo: (v: VideoLesson, adminEmail: string) => Promise<void>;
  deleteVideo: (id: string, adminEmail: string) => Promise<void>;
  loadNotes: (examId?: string) => Promise<void>;
  saveNote: (n: StudyNote, adminEmail: string) => Promise<void>;
  deleteNote: (id: string, adminEmail: string) => Promise<void>;
  saveLiveTest: (t: LiveTest, adminEmail: string) => Promise<void>;
  deleteLiveTest: (id: string, adminEmail: string) => Promise<void>;
  loadStudents: (filters?: {
    searchQuery?: string;
    circle?: string;
    status?: string;
  }) => Promise<void>;
  toggleStudentStatus: (
    id: string,
    status: 'Active' | 'Suspended',
    adminEmail: string
  ) => Promise<void>;
  loadAuditLogs: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardOverview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [st, ex, ch, qs, stu, lts, logs] = await Promise.all([
        AdminService.getAdminStats(),
        AdminService.getExams(),
        AdminService.getChapters(),
        AdminService.getQuestions(),
        AdminService.getStudents(),
        AdminService.getLiveTests(),
        AdminService.getAuditLogs(),
      ]);
      setStats(st);
      setExams(ex);
      setChapters(ch);
      setQuestions(qs);
      setStudents(stu);
      setLiveTests(lts);
      setAuditLogs(logs);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async (filters?: {
    examId?: string;
    chapterId?: string;
    languageCode?: string;
    difficulty?: string;
    isPublished?: boolean;
    searchQuery?: string;
  }) => {
    setIsLoading(true);
    try {
      const [qs, ex, ch] = await Promise.all([
        AdminService.getQuestions(filters),
        AdminService.getExams(),
        AdminService.getChapters(),
      ]);
      setQuestions(qs);
      setExams(ex);
      setChapters(ch);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuestion = async (q: Question, adminEmail: string) => {
    await AdminService.saveQuestion(q, adminEmail);
    await loadQuestions();
    setStats(await AdminService.getAdminStats());
  };

  const deleteQuestion = async (id: string, adminEmail: string) => {
    await AdminService.deleteQuestion(id, adminEmail);
    await loadQuestions();
    setStats(await AdminService.getAdminStats());
  };

  const duplicateQuestion = async (id: string, adminEmail: string) => {
    const dup = await AdminService.duplicateQuestion(id, adminEmail);
    await loadQuestions();
    return dup;
  };

  const toggleQuestionStatus = async (id: string, pub: boolean, adminEmail: string) => {
    await AdminService.toggleQuestionStatus(id, pub, adminEmail);
    await loadQuestions();
  };

  const saveExam = async (exam: Exam, adminEmail: string) => {
    await AdminService.saveExam(exam, adminEmail);
    setExams(await AdminService.getExams());
  };

  const deleteExam = async (id: string, adminEmail: string) => {
    await AdminService.deleteExam(id, adminEmail);
    setExams(await AdminService.getExams());
  };

  const saveChapter = async (chapter: Chapter, adminEmail: string) => {
    await AdminService.saveChapter(chapter, adminEmail);
    setChapters(await AdminService.getChapters());
  };

  const deleteChapter = async (id: string, adminEmail: string) => {
    await AdminService.deleteChapter(id, adminEmail);
    setChapters(await AdminService.getChapters());
  };

  const loadVideos = async (examId?: string) => {
    setVideos(await AdminService.getVideos(examId));
  };

  const saveVideo = async (v: VideoLesson, adminEmail: string) => {
    await AdminService.saveVideo(v, adminEmail);
    setVideos(await AdminService.getVideos());
  };

  const deleteVideo = async (id: string, adminEmail: string) => {
    await AdminService.deleteVideo(id, adminEmail);
    setVideos(await AdminService.getVideos());
  };

  const loadNotes = async (examId?: string) => {
    setNotes(await AdminService.getNotes(examId));
  };

  const saveNote = async (n: StudyNote, adminEmail: string) => {
    await AdminService.saveNote(n, adminEmail);
    setNotes(await AdminService.getNotes());
  };

  const deleteNote = async (id: string, adminEmail: string) => {
    await AdminService.deleteNote(id, adminEmail);
    setNotes(await AdminService.getNotes());
  };

  const saveLiveTest = async (t: LiveTest, adminEmail: string) => {
    await AdminService.saveLiveTest(t, adminEmail);
    setLiveTests(await AdminService.getLiveTests());
  };

  const deleteLiveTest = async (id: string, adminEmail: string) => {
    await AdminService.deleteLiveTest(id, adminEmail);
    setLiveTests(await AdminService.getLiveTests());
  };

  const loadStudents = async (filters?: {
    searchQuery?: string;
    circle?: string;
    status?: string;
  }) => {
    setStudents(await AdminService.getStudents(filters));
  };

  const toggleStudentStatus = async (
    id: string,
    status: 'Active' | 'Suspended',
    adminEmail: string
  ) => {
    await AdminService.toggleStudentStatus(id, status, adminEmail);
    setStudents(await AdminService.getStudents());
  };

  const loadAuditLogs = async () => {
    setAuditLogs(await AdminService.getAuditLogs());
  };

  return (
    <AdminContext.Provider
      value={{
        stats,
        questions,
        exams,
        chapters,
        students,
        liveTests,
        videos,
        notes,
        auditLogs,
        isLoading,
        errorMessage,
        loadDashboardOverview,
        loadQuestions,
        saveQuestion,
        deleteQuestion,
        duplicateQuestion,
        toggleQuestionStatus,
        saveExam,
        deleteExam,
        saveChapter,
        deleteChapter,
        loadVideos,
        saveVideo,
        deleteVideo,
        loadNotes,
        saveNote,
        deleteNote,
        saveLiveTest,
        deleteLiveTest,
        loadStudents,
        toggleStudentStatus,
        loadAuditLogs,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
};
