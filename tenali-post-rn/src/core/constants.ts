export interface ExamCategoryMeta {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  icon: string;
}

export interface LanguageMeta {
  code: 'en' | 'te' | 'hi';
  name: string;
  nativeName: string;
}

export const AppConstants = {
  appName: 'Tenali Post',
  appTagline: 'Learn • Prepare • Succeed',
  appSubtext: 'Excellence in Postal & Competitive Exams',

  // The only authorized administrator email
  authorizedAdminEmail: 'tenaliexampublishers26@gmail.com',
  initialAdminEmail: 'tenaliexampublishers26@gmail.com',
  legacyAdminEmail: 'tenaliexamspublishers26@gmail.com',

  exams: [
    {
      id: 'mts',
      title: 'MTS Examination',
      subtitle: 'Multi-Tasking Staff (Departmental)',
      code: 'MTS',
      icon: 'school',
    },
    {
      id: 'postman',
      title: 'Postman & Mail Guard',
      subtitle: 'Postman / Mail Guard Cadre Examination',
      code: 'PMG',
      icon: 'local_post_office',
    },
    {
      id: 'pasa',
      title: 'PA / SA Examination',
      subtitle: 'Postal Assistant & Sorting Assistant',
      code: 'PASA',
      icon: 'badge',
    },
    {
      id: 'lgo',
      title: 'LGO Examination',
      subtitle: 'Lower Grade Official Promotion',
      code: 'LGO',
      icon: 'workspace_premium',
    },
    {
      id: 'inspector',
      title: 'Inspector Posts (IP)',
      subtitle: 'Departmental Examination for IP Cadre',
      code: 'IP',
      icon: 'military_tech',
    },
  ] as ExamCategoryMeta[],

  languages: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ] as LanguageMeta[],

  // Supabase Project Configuration
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://nrlsqwvpbrinbagwzrfk.supabase.co',
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_KY5GqZ_BF7glQXNvg53RvQ_wVt_pSe_',

  // Example Student & Admin Login Credentials for instant app access
  exampleLoginEmail: 'student@example.com',
  exampleLoginPassword: 'Password@123',
  exampleAdminEmail: 'tenaliexampublishers26@gmail.com',
  exampleAdminPassword: 'Admin@123',
};
