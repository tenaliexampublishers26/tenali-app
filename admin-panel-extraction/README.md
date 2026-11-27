# Admin Panel Extraction Package — Next.js Website -> Flutter LMS

This folder contains the complete, read-only technical extraction of the **Tenali Exams Publishers** admin panel from the existing Next.js/TypeScript/Supabase codebase, packaged for building the new **Flutter / Dart Native Android LMS** (strictly excluding e-commerce functionality).

> **Extraction Integrity:** Generated strictly via direct inspection of existing source files, SQL migration scripts, and live PostgreSQL / Supabase Storage catalogs. Zero existing source files, database tables, RLS policies, or deployment configs were modified. No secrets or credentials are included.

---

## Package Directory

### 1. High-Level & Architectural Documentation (`/documentation`)
- [ADMIN_PANEL_COMPLETE_DOCUMENTATION.md](./documentation/ADMIN_PANEL_COMPLETE_DOCUMENTATION.md) — Executive overview of roles, admin modules, and architectural gaps between Next.js server SQL and Flutter Supabase SDK.
- [ADMIN_DATABASE_SCHEMA.md](./documentation/ADMIN_DATABASE_SCHEMA.md) — LMS vs. legacy vs. excluded e-commerce table classification, constraints, and Flutter RLS checklist.
- [ADMIN_FILE_STRUCTURE.md](./documentation/ADMIN_FILE_STRUCTURE.md) — Complete source map of every admin page, API route, guard, utility, and component with migration scope.
- [ADMIN_WORKFLOWS.md](./documentation/ADMIN_WORKFLOWS.md) — Step-by-step operational flows for Auth, MCQ Publishing/Practice, Live Test Exam/Key Release, and Notes Permissions.
- [ADMIN_REUSABLE_LOGIC.md](./documentation/ADMIN_REUSABLE_LOGIC.md) — Pure algorithms (CSV/JSON/Excel parser & validator, scoring & merit ranking, recursive folder tree traversal, RFC 4648 TOTP, file size helpers) ready for Dart translation.
- [LMS_ADMIN_IMPLEMENTATION_GUIDE.md](./documentation/LMS_ADMIN_IMPLEMENTATION_GUIDE.md) — Flutter/Dart clean architecture layout, Supabase Edge Function/RLS blueprint, Dart package mapping, and Google Play Store readiness guide.

### 2. Source Code & Feature Deep-Dives (`/source-reference`)
- [AUTHENTICATION_REFERENCE.md](./source-reference/AUTHENTICATION_REFERENCE.md) — Hybrid auth (`tep_session` HMAC + Supabase Auth), `verifyAdminAccess`, `src/proxy.ts` gates, 2FA TOTP coverage gap, and audit logging.
- [ADMIN_API_REFERENCE.md](./source-reference/ADMIN_API_REFERENCE.md) — Exhaustive catalog of every LMS-relevant Admin, Auth, Student, MCQ, Live Test, and Notes API endpoint.
- [ADMIN_COMPONENTS_REFERENCE.md](./source-reference/ADMIN_COMPONENTS_REFERENCE.md) — Admin layout, `AdminUI.tsx` primitives, `Admin2FAModal`, `McqToggleCard`, `PdfViewerModal`, Users, Settings, Audit History, and Profile pages.
- [MCQ_MANAGEMENT_REFERENCE.md](./source-reference/MCQ_MANAGEMENT_REFERENCE.md) — 4-level topic/subtopic/chapter/medium hierarchy, versioned question sets, CSV/JSON/Excel schemas, validation rules, and concrete templates.
- [LIVE_TEST_REFERENCE.md](./source-reference/LIVE_TEST_REFERENCE.md) — Untimed live test lifecycle (`draft`/`published`/`closed`/`answers_released`), answer-key omission & server-side scoring, ranking, and `.xlsx`/`.pdf` exports.
- [NOTES_MANAGEMENT_REFERENCE.md](./source-reference/NOTES_MANAGEMENT_REFERENCE.md) — Recursive `note_folders` + 3-dots CRUD, all 4 `is_previewable` × `allow_download` combinations, and the public bucket security fix needed for Flutter.

### 3. Live Database, RLS & Storage Reference (`/database-reference`)
- [TABLES_AND_RELATIONSHIPS.md](./database-reference/TABLES_AND_RELATIONSHIPS.md) — Verified live column definitions, types, defaults, foreign keys, unique constraints, and indexes across all LMS tables.
- [RLS_POLICIES.md](./database-reference/RLS_POLICIES.md) — All 41 live `pg_policies`, RLS status on all 31 tables, the `note_folders` missing-policy finding, `live_test_questions` exposure warning, and Flutter `is_admin()` SQL recommendations.
- [STORAGE_STRUCTURE.md](./database-reference/STORAGE_STRUCTURE.md) — Live storage bucket metadata (`notes` & `products`), naming conventions, local fallback details, and private-bucket signed URL design for Flutter.
