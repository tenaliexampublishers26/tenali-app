import {
  Chapter,
  Exam,
  LiveTest,
  Question,
  StudyNote,
  VideoLesson,
} from '../models';

export const MockData = {
  exams: [
    {
      id: 'mts',
      title: 'MTS Examination',
      subtitle: 'Multi-Tasking Staff Departmental Exam',
      code: 'MTS',
      totalChapters: 0,
      totalQuestions: 0,
      iconName: 'school',
    },
    {
      id: 'postman',
      title: 'Postman & Mail Guard',
      subtitle: 'Postman Cadre Competitive & Departmental',
      code: 'PMG',
      totalChapters: 0,
      totalQuestions: 0,
      iconName: 'local_post_office',
    },
    {
      id: 'pasa',
      title: 'PA / SA Examination',
      subtitle: 'Postal Assistant & Sorting Assistant Exam',
      code: 'PASA',
      totalChapters: 0,
      totalQuestions: 0,
      iconName: 'badge',
    },
    {
      id: 'lgo',
      title: 'LGO Examination',
      subtitle: 'Lower Grade Official Promotion Exam',
      code: 'LGO',
      totalChapters: 0,
      totalQuestions: 0,
      iconName: 'workspace_premium',
    },
  ] as Exam[],

  chapters: [] as Chapter[],
  sampleQuestions: [] as Question[],
  liveTests: [] as LiveTest[],
  videoLessons: [] as VideoLesson[],
  studyNotes: [] as StudyNote[],
};
