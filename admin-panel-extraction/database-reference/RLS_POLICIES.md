# Row-Level Security (RLS) Policies & Access Model

> **Audit Basis:** Live `pg_class.relrowsecurity` & `pg_policies` inspection across `public` and `storage` schemas, cross-checked against `Supbase/fix_supabase_rls_and_security.sql` and `Supbase/enable_strict_rls_and_revoke_anon_writes.sql`.

---

## 1. Critical Architecture Contrast: Next.js vs. Flutter LMS

1. **Current Website (Next.js)**:
   - Admin API routes and most student API routes query PostgreSQL through `src/lib/db.ts` (`postgres` client connected to `DATABASE_URL` transaction pooler).
   - That connection executes as the privileged `postgres` role, which **bypasses all RLS policies**.
   - Authorization is enforced in Next.js server routes via `verifyAdminAccess(request)` (`src/lib/admin-guard.ts`) and `resolveStudentAuth(request)` (`src/lib/student-auth.ts`).
2. **Target App (Flutter Android LMS using Supabase SDK)**:
   - Direct calls from Flutter `supabase_flutter` use PostgREST with the `anon` or `authenticated` JWT role, where **PostgreSQL enforces every RLS policy strictly**.
   - As hardened by `Supbase/enable_strict_rls_and_revoke_anon_writes.sql`, all write privileges (`INSERT`, `UPDATE`, `DELETE`) were revoked from `anon` and `public` across tables, and nearly all admin tables only grant `ALL` to `service_role`!

> [!IMPORTANT]
> You **cannot** perform admin mutations (creating topics, importing MCQs, publishing live tests, uploading notes, toggling settings) from the Flutter client directly through PostgREST until you EITHER:
> 1. Route admin writes through **Supabase Edge Functions** using `service_role` after verifying `users.role = 'admin'`, OR
> 2. Add PostgreSQL RLS policies for `authenticated` using an `is_admin()` security-definer helper checking `EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')`.

---

## 2. Live RLS Status Across All Tables

Every one of the **31 tables** in `public` currently has `relrowsecurity = true`:
`addresses`, `admin_2fa_secrets`, `admin_audit_logs`, `live_test_questions`, `live_test_submissions`, `live_tests`, `mcq_attempt_answers`, `mcq_attempts`, `mcq_bookmarks`, `mcq_categories`, `mcq_chapters`, `mcq_import_logs`, `mcq_mediums`, `mcq_options`, `mcq_question_sets`, `mcq_questions`, `mcq_topics`, `note_folders`, `order_items`, `orders`, `payment_sessions`, `pdf_materials`, `pdf_uploads`, `products`, `settings`, `subscription_plans`, `user_addresses`, `user_quiz_attempts`, `user_subscriptions`, `users`, `wishlist_items`.

Additionally, the database event trigger `auto_enable_rls_for_new_tables` enforces RLS on any newly created `public` table automatically.

---

## 3. Exact Live `pg_policies` Definitions (41 Policies)

### 3.1 Admin Security & Settings Tables
| Table | Policy Name | Cmd | Roles | Condition (`qual` / `with_check`) |
|---|---|---|---|---|
| `admin_2fa_secrets` | `Service role full access on admin_2fa_secrets` | `ALL` | `service_role` | `true` / `true` |
| `admin_audit_logs` | `Service role full access on admin_audit_logs` | `ALL` | `service_role` | `true` / `true` |
| `settings` | `Allow public read access to settings` | `SELECT` | `public` | `true` / `null` |
| `users` | `Allow authenticated users to read own user record` | `SELECT` | `authenticated` | `((id)::text = (auth.uid())::text)` / `null` |
| `users` | `Allow authenticated users to update own profile` | `UPDATE` | `authenticated` | `((id)::text = (auth.uid())::text)` / `((id)::text = (auth.uid())::text)` |

### 3.2 MCQ Tables
| Table | Policy Name | Cmd | Roles | Condition (`qual` / `with_check`) |
|---|---|---|---|---|
| `mcq_topics` | `Allow public read access to mcq_topics` | `SELECT` | `public` | `true` / `null` |
| `mcq_chapters` | `Allow public read access to mcq_chapters` | `SELECT` | `public` | `true` / `null` |
| `mcq_categories` | `Allow public read access to mcq_categories` | `SELECT` | `public` | `true` / `null` |
| `mcq_mediums` | `Allow public read active mcq mediums` | `SELECT` | `public` | `(is_active = true)` / `null` |
| `mcq_mediums` | `Service role full access on mcq_mediums` | `ALL` | `service_role` | `true` / `true` |
| `mcq_question_sets` | `Allow public read published mcq question sets` | `SELECT` | `public` | `((status)::text = 'published'::text)` / `null` |
| `mcq_question_sets` | `Service role full access on mcq_question_sets` | `ALL` | `service_role` | `true` / `true` |
| `mcq_questions` | `Allow public read access to mcq_questions` | `SELECT` | `public` | `true` / `null` |
| `mcq_options` | `Allow public read access to mcq_options` | `SELECT` | `public` | `true` / `null` |
| `mcq_import_logs` | `Service role full access on mcq_import_logs` | `ALL` | `service_role` | `true` / `true` |
| `mcq_attempts` | `Allow users to insert own mcq attempts` | `INSERT` | `authenticated` | `null` / `((user_id)::text = (auth.uid())::text)` |
| `mcq_attempts` | `Allow users to read own mcq attempts` | `SELECT` | `authenticated` | `((user_id)::text = (auth.uid())::text)` / `null` |
| `mcq_attempt_answers` | `Allow users to insert own attempt answers` | `INSERT` | `authenticated` | `null` / `EXISTS (SELECT 1 FROM mcq_attempts a WHERE a.id = mcq_attempt_answers.attempt_id AND a.user_id::text = auth.uid()::text)` |
| `mcq_attempt_answers` | `Allow users to read own attempt answers` | `SELECT` | `authenticated` | `EXISTS (SELECT 1 FROM mcq_attempts a WHERE a.id = mcq_attempt_answers.attempt_id AND a.user_id::text = auth.uid()::text)` / `null` |
| `mcq_attempt_answers` | `Service role full access on mcq_attempt_answers` | `ALL` | `service_role` | `true` / `true` |
| `mcq_bookmarks` | `Allow users to manage own mcq bookmarks` | `ALL` | `authenticated` | `((user_id)::text = (auth.uid())::text)` / `((user_id)::text = (auth.uid())::text)` |
| `user_quiz_attempts` | `Allow users to insert own quiz attempts` | `INSERT` | `authenticated` | `null` / `((user_id)::text = (auth.uid())::text)` |
| `user_quiz_attempts` | `Allow users to read own quiz attempts` | `SELECT` | `authenticated` | `((user_id)::text = (auth.uid())::text)` / `null` |

### 3.3 Live Test Tables
| Table | Policy Name | Cmd | Roles | Condition (`qual` / `with_check`) |
|---|---|---|---|---|
| `live_tests` | `Allow public read active live tests` | `SELECT` | `public` | `((status)::text = ANY ((ARRAY['published'::varchar, 'closed'::varchar])::text[]))` / `null` |
| `live_tests` | `Service role full access on live_tests` | `ALL` | `service_role` | `true` / `true` |
| `live_test_questions` | `Allow public read questions for published live tests` | `SELECT` | `public` | `EXISTS (SELECT 1 FROM live_tests lt WHERE lt.id = live_test_questions.test_id AND lt.status::text = ANY (ARRAY['published'::varchar, 'closed'::varchar]::text[]))` / `null` |
| `live_test_questions` | `Service role full access on live_test_questions` | `ALL` | `service_role` | `true` / `true` |
| `live_test_submissions` | `Allow users to read own live test submissions` | `SELECT` | `authenticated` | `((user_id)::text = (auth.uid())::text)` / `null` |
| `live_test_submissions` | `Service role full access on live_test_submissions` | `ALL` | `service_role` | `true` / `true` |

> [!WARNING]
> **Security Finding for Flutter LMS:** Notice that `live_test_questions` currently allows `public` `SELECT` (`qual = EXISTS ... published/closed`) across **all columns** including `correct_option` and `explanation`! The Next.js website prevents cheating only because its API endpoint `GET /api/live-tests/[testId]` omits `correct_option` and `explanation` in SQL `SELECT`. If a Flutter client queries `live_test_questions` directly via Supabase SDK while a test is `published`, a modified client could read `correct_option` directly! **Fix for Flutter:** Revoke `SELECT (correct_option, explanation)` from `anon`/`authenticated` OR serve test questions through an RPC / Edge Function that masks `correct_option` & `explanation` until `answers_released = true` or `is_admin()`.

### 3.4 Notes & Storage Tables
| Table | Policy Name | Cmd | Roles | Condition (`qual` / `with_check`) |
|---|---|---|---|---|
| `pdf_materials` | `Allow public read access to pdf_materials` | `SELECT` | `public` | `true` / `null` |
| `pdf_uploads` | `Service role full access on pdf_uploads` | `ALL` | `service_role` | `true` / `true` |
| `note_folders` | *(NO POLICIES EXIST)* | — | — | `rls_enabled = true` with zero policies -> **blocks all non-service-role PostgREST reads** |
| `storage.objects` | `Service role full access on storage.objects` | `ALL` | `service_role` | `true` / `true` |

> [!CAUTION]
> **`note_folders` Gap:** Because `auto_enable_rls_for_new_tables` turned RLS on when `note_folders` was created and no `SELECT` policy was created, Flutter PostgREST queries to `note_folders` will return `[]` unless you add a `SELECT` policy (`public` or `authenticated`) and admin write policies!

---

## 4. Recommended RLS Additions for Flutter LMS

If your Flutter Admin panel uses Supabase Auth JWTs (plus an `is_admin()` PostgreSQL function), add:

1. **Admin helper function (`SECURITY DEFINER`)**:
   ```sql
   CREATE OR REPLACE FUNCTION public.is_admin()
   RETURNS boolean
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.users
       WHERE id = auth.uid() AND role = 'admin'
     );
   $$;
   ```
2. **Admin `ALL` policies** (`USING (public.is_admin()) WITH CHECK (public.is_admin())`) on:
   - `mcq_topics`, `mcq_chapters`, `mcq_mediums`, `mcq_question_sets`, `mcq_questions`, `mcq_import_logs`
   - `live_tests`, `live_test_questions`, `live_test_submissions` (including `SELECT` all submissions for results/export)
   - `note_folders`, `pdf_materials`
   - `settings`, `users` (admin read all students), `admin_audit_logs`
   - `storage.objects` (`bucket_id = 'notes'`)
3. **Student read policy for `note_folders`**:
   - Allow `authenticated` `SELECT` on `note_folders`.
4. **Live Test Answer-Key Column/RPC Protection**:
   - Serve active test questions via an `SECURITY DEFINER` RPC `get_live_test_questions(p_test_id uuid)` that returns `correct_option` and `explanation` **only** when `answers_released = true` OR `public.is_admin()`.
5. **Prevent `users.role` Self-Escalation**:
   - Live DB currently allows `authenticated` to `UPDATE` their own row in `users` (`((id)::text = (auth.uid())::text)`). Ensure `WITH CHECK` prevents a student from setting `role = 'admin'`, or restrict `UPDATE` grants on `users` to `(name, phone, image, updated_at)` columns only.
