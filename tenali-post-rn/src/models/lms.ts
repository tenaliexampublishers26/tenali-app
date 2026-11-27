export interface LmsSettings {
  mcqEnabled: boolean;
  liveTestEnabled: boolean;
  maintenanceMode: boolean;
  liveNotificationEnabled: boolean;
  liveNotificationText: string;
  liveNotificationLink: string;
}

export const defaultLmsSettings: LmsSettings = {
  mcqEnabled: true,
  liveTestEnabled: true,
  maintenanceMode: false,
  liveNotificationEnabled: false,
  liveNotificationText: '',
  liveNotificationLink: '',
};

export function lmsSettingsFromKeyValueRows(rows: any[]): LmsSettings {
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row && typeof row === 'object') {
      const k = String(row.key ?? '');
      const v = String(row.value ?? '');
      if (k) map[k] = v;
    }
  }
  return {
    mcqEnabled: map.mcq_enabled !== 'false',
    liveTestEnabled: map.live_test_enabled !== 'false',
    maintenanceMode: map.maintenance_mode === 'true',
    liveNotificationEnabled: map.live_notification_enabled === 'true',
    liveNotificationText: map.live_notification_text ?? '',
    liveNotificationLink: map.live_notification_link ?? '',
  };
}

export interface LmsAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  actionType: string;
  targetType: string;
  targetName: string;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress: string;
  locationName: string;
  createdAt: string;
}

export function lmsAuditLogFromJson(json: Record<string, any>): LmsAuditLog {
  return {
    id: String(json.id ?? ''),
    adminId: String(json.admin_id ?? ''),
    adminName: String(json.admin_name ?? 'Admin'),
    adminEmail: String(json.admin_email ?? ''),
    actionType: String(json.action_type ?? 'UPDATE'),
    targetType: String(json.target_type ?? 'settings'),
    targetName: String(json.target_name ?? ''),
    previousValue: json.previous_value ?? null,
    newValue: json.new_value ?? null,
    ipAddress: String(json.ip_address ?? 'mobile-app'),
    locationName: String(json.location_name ?? 'Tenali, Andhra Pradesh, India'),
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
  };
}

export interface McqTopic {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string | null;
  icon: string;
  displayOrder: number;
  isPublished: boolean;
  isActive: boolean;
  parentId?: string | null;
  chapterCount: number;
  questionCount: number;
}

export function mcqTopicFromJson(json: Record<string, any>): McqTopic {
  return {
    id: String(json.id ?? ''),
    slug: String(json.slug ?? ''),
    name: String(json.name ?? ''),
    category: String(json.category ?? 'General'),
    description: json.description ?? null,
    icon: String(json.icon ?? 'book-open'),
    displayOrder: Number(json.display_order ?? json.order_index ?? 1),
    isPublished: json.is_published !== false,
    isActive: json.is_active !== false,
    parentId: json.parent_id ?? null,
    chapterCount: Number(json.chapter_count ?? 0),
    questionCount: Number(json.question_count ?? 0),
  };
}

export interface McqChapter {
  id: string;
  topicId: string;
  title: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
  isPublished: boolean;
  questionCount: number;
  publishedSetsCount: number;
}

export function mcqChapterFromJson(json: Record<string, any>): McqChapter {
  return {
    id: String(json.id ?? ''),
    topicId: String(json.topic_id ?? ''),
    title: String(json.title ?? json.name ?? ''),
    slug: String(json.slug ?? ''),
    description: json.description ?? null,
    displayOrder: Number(json.display_order ?? json.order_index ?? 1),
    isPublished: json.is_published ?? json.is_active ?? true,
    questionCount: Number(json.question_count ?? 0),
    publishedSetsCount: Number(json.published_sets_count ?? 0),
  };
}

export interface McqMedium {
  id: string;
  code: string;
  displayName: string;
  isActive: boolean;
}

export function mcqMediumFromJson(json: Record<string, any>): McqMedium {
  return {
    id: String(json.id ?? ''),
    code: String(json.code ?? 'en'),
    displayName: String(json.display_name ?? 'English'),
    isActive: json.is_active !== false,
  };
}

export interface McqQuestionSet {
  id: string;
  chapterId: string;
  mediumId: string;
  version: number;
  status: 'draft' | 'published' | 'archived' | string;
  questionCount: number;
  createdAt: string;
  publishedAt?: string | null;
}

export function mcqQuestionSetFromJson(json: Record<string, any>): McqQuestionSet {
  return {
    id: String(json.id ?? ''),
    chapterId: String(json.chapter_id ?? ''),
    mediumId: String(json.medium_id ?? ''),
    version: Number(json.version ?? 1),
    status: String(json.status ?? 'draft'),
    questionCount: Number(json.question_count ?? 0),
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
    publishedAt: json.published_at ?? null,
  };
}

export interface LmsMcqQuestion {
  id: string;
  questionSetId: string;
  chapterId?: string | null;
  questionKey: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
  language: string;
  difficulty: string;
  displayOrder: number;
  status: string;
}

export function lmsMcqQuestionFromJson(json: Record<string, any>): LmsMcqQuestion {
  return {
    id: String(json.id ?? ''),
    questionSetId: String(json.question_set_id ?? ''),
    chapterId: json.chapter_id ?? null,
    questionKey: String(json.question_key ?? 'Q1'),
    questionText: String(json.question_text ?? ''),
    optionA: String(json.option_a ?? ''),
    optionB: String(json.option_b ?? ''),
    optionC: String(json.option_c ?? ''),
    optionD: String(json.option_d ?? ''),
    correctOption: String(json.correct_option ?? 'A').toUpperCase(),
    explanation: String(json.explanation ?? ''),
    language: String(json.language ?? 'en'),
    difficulty: String(json.difficulty ?? 'medium'),
    displayOrder: Number(json.display_order ?? 1),
    status: String(json.status ?? 'draft'),
  };
}

export interface McqImportLog {
  id: string;
  topicId?: string | null;
  chapterId?: string | null;
  mediumId?: string | null;
  fileName: string;
  fileType: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorSummary?: string | null;
  createdAt: string;
}

export interface McqAttemptRecord {
  id: string;
  userId: string;
  questionSetId?: string | null;
  questionSetVersion: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  score: number;
  submittedAt: string;
}

export interface LmsLiveTest {
  id: string;
  title: string;
  description: string;
  testDate: string;
  status: 'draft' | 'published' | 'closed' | string;
  questionCount: number;
  answersReleased: boolean;
  attemptsCount: number;
  createdAt: string;
}

export function lmsLiveTestFromJson(json: Record<string, any>): LmsLiveTest {
  return {
    id: String(json.id ?? ''),
    title: String(json.title ?? ''),
    description: String(json.description ?? ''),
    testDate: json.test_date ? String(json.test_date) : new Date().toISOString(),
    status: String(json.status ?? 'draft'),
    questionCount: Number(json.question_count ?? 0),
    answersReleased: Boolean(json.answers_released ?? false),
    attemptsCount: Number(json.attempts_count ?? 0),
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
  };
}

export interface LmsLiveTestQuestion {
  id: string;
  testId: string;
  questionKey: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string | null;
  explanation?: string | null;
  displayOrder: number;
}

export function lmsLiveTestQuestionFromJson(
  json: Record<string, any>
): LmsLiveTestQuestion {
  return {
    id: String(json.id ?? ''),
    testId: String(json.test_id ?? ''),
    questionKey: String(json.question_key ?? 'Q1'),
    questionText: String(json.question_text ?? ''),
    optionA: String(json.option_a ?? ''),
    optionB: String(json.option_b ?? ''),
    optionC: String(json.option_c ?? ''),
    optionD: String(json.option_d ?? ''),
    correctOption: json.correct_option ? String(json.correct_option).toUpperCase() : null,
    explanation: json.explanation ?? null,
    displayOrder: Number(json.display_order ?? 1),
  };
}

export interface LmsLiveTestSubmission {
  id: string;
  testId: string;
  userId?: string | null;
  studentName: string;
  phoneNumber: string;
  location: string;
  email: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  marksObtained: number;
  percentage: number;
  answers: Record<string, string>;
  submittedAt: string;
  rank: number;
}

export function lmsLiveTestSubmissionFromJson(
  json: Record<string, any>,
  rank = 0
): LmsLiveTestSubmission {
  const parsedAnswers: Record<string, string> = {};
  if (json.answers && typeof json.answers === 'object') {
    for (const [k, v] of Object.entries(json.answers)) {
      parsedAnswers[String(k)] = String(v);
    }
  }
  return {
    id: String(json.id ?? ''),
    testId: String(json.test_id ?? ''),
    userId: json.user_id ?? null,
    studentName: String(json.student_name ?? ''),
    phoneNumber: String(json.phone_number ?? ''),
    location: String(json.location ?? ''),
    email: String(json.email ?? ''),
    totalQuestions: Number(json.total_questions ?? 0),
    attemptedCount: Number(json.attempted_count ?? 0),
    correctCount: Number(json.correct_count ?? 0),
    wrongCount: Number(json.wrong_count ?? 0),
    marksObtained: Number(json.marks_obtained ?? 0),
    percentage: Number(json.percentage ?? 0),
    answers: parsedAnswers,
    submittedAt: json.submitted_at ? String(json.submitted_at) : new Date().toISOString(),
    rank,
  };
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function noteFolderFromJson(json: Record<string, any>): NoteFolder {
  return {
    id: String(json.id ?? ''),
    name: String(json.name ?? ''),
    parentId: json.parent_id ?? null,
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
    updatedAt: json.updated_at ? String(json.updated_at) : new Date().toISOString(),
  };
}

export interface PdfMaterial {
  id: string;
  title: string;
  description: string;
  categoryCode: string;
  storagePath: string;
  pdfUrl: string;
  fileSize: string;
  pagesCount: number;
  isFree: boolean;
  downloadCount: number;
  allowDownload: boolean;
  isPreviewable: boolean;
  folderId?: string | null;
  createdAt: string;
}

export function pdfMaterialFromJson(json: Record<string, any>): PdfMaterial {
  return {
    id: String(json.id ?? ''),
    title: String(json.title ?? ''),
    description: String(json.description ?? ''),
    categoryCode: String(json.category_code ?? 'NOTES'),
    storagePath: String(json.storage_path ?? ''),
    pdfUrl: String(json.pdf_url ?? ''),
    fileSize: String(json.file_size ?? '0 KB'),
    pagesCount: Number(json.pages_count ?? 1),
    isFree: json.is_free !== false,
    downloadCount: Number(json.download_count ?? 0),
    allowDownload: Boolean(json.allow_download ?? false),
    isPreviewable: json.is_previewable !== false,
    folderId: json.folder_id ?? null,
    createdAt: json.created_at ? String(json.created_at) : new Date().toISOString(),
  };
}

export interface LmsStudentSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  mcqAttempts: McqAttemptRecord[];
  liveTestSubmissions: LmsLiveTestSubmission[];
  bookmarkCount: number;
}
