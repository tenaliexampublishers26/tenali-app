export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  location?: string | null;
  postalCircle?: string | null;
  role: string; // 'student' | 'admin'
  avatarUrl?: string | null;
  createdAt: string;
}

export function isUserAdmin(user?: UserProfile | null): boolean {
  return (user?.role || '').toLowerCase() === 'admin';
}

export function isProfileComplete(user?: UserProfile | null): boolean {
  if (!user) return false;
  return (
    user.fullName.trim().length > 0 &&
    user.email.trim().length > 0 &&
    (user.phoneNumber ?? '').trim().length > 0 &&
    (user.location ?? user.postalCircle ?? '').trim().length > 0
  );
}

export function userProfileFromJson(json: Record<string, any>): UserProfile {
  return {
    id: String(json.id ?? ''),
    email: String(json.email ?? ''),
    fullName: String(json.full_name ?? json.name ?? 'Candidate'),
    phoneNumber: json.phone_number ?? null,
    location: json.location ?? json.postal_circle ?? null,
    postalCircle: json.postal_circle ?? json.location ?? null,
    role: String(json.role ?? 'student'),
    avatarUrl: json.avatar_url ?? null,
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
  };
}

export function userProfileToJson(profile: UserProfile): Record<string, any> {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    phone_number: profile.phoneNumber ?? null,
    location: profile.location ?? profile.postalCircle ?? null,
    postal_circle: profile.postalCircle ?? profile.location ?? null,
    role: profile.role,
    avatar_url: profile.avatarUrl ?? null,
    created_at: profile.createdAt,
  };
}

export interface Exam {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  totalChapters: number;
  totalQuestions: number;
  iconName: string;
}

export function examFromJson(json: Record<string, any>): Exam {
  return {
    id: String(json.id ?? ''),
    title: String(json.title ?? ''),
    subtitle: String(json.subtitle ?? ''),
    code: String(json.code ?? ''),
    totalChapters: Number(json.total_chapters ?? 0),
    totalQuestions: Number(json.total_questions ?? 0),
    iconName: String(json.icon_name ?? 'school'),
  };
}

export interface Chapter {
  id: string;
  examId: string;
  title: string;
  description?: string | null;
  chapterNumber: number;
  totalQuestions: number;
  supportedLanguages: string[];
}

export function chapterFromJson(json: Record<string, any>): Chapter {
  return {
    id: String(json.id ?? ''),
    examId: String(json.exam_id ?? ''),
    title: String(json.title ?? ''),
    description: json.description ?? null,
    chapterNumber: Number(json.chapter_number ?? 1),
    totalQuestions: Number(json.total_questions ?? 0),
    supportedLanguages: Array.isArray(json.supported_languages)
      ? json.supported_languages.map(String)
      : ['en', 'te', 'hi'],
  };
}

export interface Question {
  id: string;
  chapterId: string;
  examId: string;
  languageCode: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string | null;
  explanation?: string | null;
  postalRuleRef?: string | null;
  questionNumber: number;
  difficulty: string;
  isPublished: boolean;
}

export function questionFromJson(json: Record<string, any>): Question {
  return {
    id: String(json.id ?? ''),
    chapterId: String(json.chapter_id ?? ''),
    examId: String(json.exam_id ?? ''),
    languageCode: String(json.language_code ?? 'en'),
    questionText: String(json.question_text ?? ''),
    optionA: String(json.option_a ?? ''),
    optionB: String(json.option_b ?? ''),
    optionC: String(json.option_c ?? ''),
    optionD: String(json.option_d ?? ''),
    correctOption: json.correct_option ?? null,
    explanation: json.explanation ?? null,
    postalRuleRef: json.postal_rule_ref ?? null,
    questionNumber: Number(json.question_number ?? 1),
    difficulty: String(json.difficulty ?? 'Medium'),
    isPublished: json.is_published !== false,
  };
}

export function getOptionText(q: Question, optionKey: string): string {
  switch (optionKey.toUpperCase()) {
    case 'A':
      return q.optionA;
    case 'B':
      return q.optionB;
    case 'C':
      return q.optionC;
    case 'D':
      return q.optionD;
    default:
      return '';
  }
}

export interface LiveTest {
  id: string;
  title: string;
  description: string;
  examId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  passMarks: number;
  negativeMarksPerWrong: number;
  isPublished: boolean;
  isResultsPublished: boolean;
}

export function isLiveTestOngoing(test: LiveTest): boolean {
  const now = Date.now();
  return (
    test.isPublished &&
    now > new Date(test.startTime).getTime() &&
    now < new Date(test.endTime).getTime()
  );
}

export function isLiveTestUpcoming(test: LiveTest): boolean {
  const now = Date.now();
  return test.isPublished && now < new Date(test.startTime).getTime();
}

export function isLiveTestEnded(test: LiveTest): boolean {
  return Date.now() > new Date(test.endTime).getTime();
}

export function liveTestFromJson(json: Record<string, any>): LiveTest {
  return {
    id: String(json.id ?? ''),
    title: String(json.title ?? ''),
    description: String(json.description ?? ''),
    examId: String(json.exam_id ?? ''),
    startTime: json.start_time ? String(json.start_time) : new Date().toISOString(),
    endTime: json.end_time
      ? String(json.end_time)
      : new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    durationMinutes: Number(json.duration_minutes ?? 60),
    totalMarks: Number(json.total_marks ?? 100),
    totalQuestions: Number(json.total_questions ?? 50),
    passMarks: Number(json.pass_marks ?? 40),
    negativeMarksPerWrong: Number(json.negative_marks ?? 0),
    isPublished: Boolean(json.is_published ?? false),
    isResultsPublished: Boolean(json.is_results_published ?? false),
  };
}

export interface LiveTestSubmission {
  id: string;
  testId: string;
  studentName: string;
  phoneNumber: string;
  marksObtained: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percentage: number;
  rank?: number | null;
  answers: Record<string, string>;
  submittedAt: string;
}

export interface StudyNote {
  id: string;
  examId: string;
  chapterId?: string | null;
  title: string;
  description: string;
  fileUrl: string;
  fileSize?: string | null;
  pageCount: number;
  languageCode: string;
  isFree: boolean;
}

export function studyNoteFromJson(json: Record<string, any>): StudyNote {
  return {
    id: String(json.id ?? ''),
    examId: String(json.exam_id ?? ''),
    chapterId: json.chapter_id ?? null,
    title: String(json.title ?? ''),
    description: String(json.description ?? ''),
    fileUrl: String(json.file_url ?? ''),
    fileSize: json.file_size ?? '1.2 MB',
    pageCount: Number(json.page_count ?? 1),
    languageCode: String(json.language_code ?? 'en'),
    isFree: json.is_free !== false,
  };
}

export interface VideoLesson {
  id: string;
  examId: string;
  chapterId?: string | null;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration: string;
  languageCode: string;
  isFree: boolean;
}

export function videoLessonFromJson(json: Record<string, any>): VideoLesson {
  return {
    id: String(json.id ?? ''),
    examId: String(json.exam_id ?? ''),
    chapterId: json.chapter_id ?? null,
    title: String(json.title ?? ''),
    description: String(json.description ?? ''),
    videoUrl: String(json.video_url ?? ''),
    thumbnailUrl: json.thumbnail_url ?? null,
    duration: String(json.duration ?? '15:00'),
    languageCode: String(json.language_code ?? 'te'),
    isFree: json.is_free !== false,
  };
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  createdBy?: string | null;
  isRead: boolean;
}

export function announcementFromJson(
  json: Record<string, any>,
  isRead = false
): Announcement {
  return {
    id: String(json.id ?? ''),
    title: String(json.title ?? ''),
    message: String(json.message ?? ''),
    isPublished: json.is_published !== false,
    publishedAt: json.published_at ? String(json.published_at) : new Date().toISOString(),
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
    createdBy: json.created_by ?? null,
    isRead: isRead || Boolean(json.is_read ?? false),
  };
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  actionType: string;
  targetEntity: string;
  targetId: string;
  description: string;
  timestamp: string;
}

export interface StudentRecord {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  postalCircle: string;
  targetExam: string;
  status: string; // 'Active' | 'Suspended'
  registeredAt: string;
  lastActiveAt: string;
  totalTestsAttempted: number;
  averagePercentage: number;
  testAttempts: LiveTestSubmission[];
}
