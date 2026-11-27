# Complete Admin Source File Structure & Responsibilities

> **Source Scope:** Verified via `git ls-files` across `src/app/admin`, `src/app/api/admin`, `src/components/admin`, `src/components/notes`, `src/lib`, `src/contexts`, `src/proxy.ts`, and `src/utils/supabase`.

---

## 1. LMS-Relevant Admin Pages (`src/app/admin/`)

| File Path | Purpose | Migrate to Flutter LMS? |
|---|---|---|
| `src/app/admin/layout.tsx` | Admin navigation rail, mobile drawer, dark mode, auth gate | Reference -> Replace with Flutter `Scaffold` + Drawer/NavigationRail |
| `src/app/admin/page.tsx` | Dashboard (`McqToggleCard` + e-commerce charts/orders) | Partial -> Rebuild dashboard with LMS KPIs & switches |
| `src/app/admin/mcq/page.tsx` | Topic/Subtopic/Chapter/Language hierarchy, Bulk Importer, Question CRUD | **YES (Core)** |
| `src/app/admin/mcq/import/page.tsx` | Redirect stub -> `/admin/mcq` | Skip (merge into MCQ screen) |
| `src/app/admin/mcq/admin-mcq.module.css` | Styling for MCQ admin hierarchy | Reference only |
| `src/app/admin/live-tests/page.tsx` | Live Tests CRUD, Global Switch, Question CRUD, Import, Release Keys, Results/Exports | **YES (Core)** |
| `src/app/admin/live-tests/live-tests.module.css` | Styling for Live Tests admin | Reference only |
| `src/app/admin/notes/page.tsx` | Recursive Note Folders, 3-dots menu, PDF upload/edit/move/delete, Preview/Download switches | **YES (Core)** |
| `src/app/admin/users/page.tsx` | User search & directory (currently modal shows e-commerce orders) | **YES (Adapt modal to Quiz/Test attempts)** |
| `src/app/admin/settings/page.tsx` | Flash Notification Marquee + Maintenance Mode (2FA-gated) | **YES** |
| `src/app/admin/history/page.tsx` | Admin Audit Logs viewer with before/after JSON diff | **YES** |
| `src/app/admin/profile/page.tsx` | Admin profile/password edit (2FA-gated) + Google Authenticator QR setup/reset | **YES** |

### Excluded E-Commerce Pages
- `src/app/admin/orders/page.tsx` (Orders & India Post shipping slips)
- `src/app/admin/products/page.tsx`, `src/app/admin/products/add/page.tsx`, `src/app/admin/products/[id]/page.tsx` (Books catalog)

---

## 2. LMS-Relevant API Routes (`src/app/api/admin/` & Supporting Routes)

### Auth, Security & Core
- `src/app/api/auth/login/route.ts` — Credential login + `tep_session` cookie
- `src/app/api/auth/register/route.ts` — Student account signup (`role = 'customer'`)
- `src/app/api/auth/sync/route.ts` — Google OAuth -> PostgreSQL `users` sync
- `src/app/api/auth/me/route.ts` — Session verification & user hydration
- `src/app/api/auth/logout/route.ts` — Cookie cleanup
- `src/app/api/admin/2fa/route.ts` — Master TOTP QR setup (`GET`) & reset (`DELETE`)
- `src/app/api/admin/profile/route.ts` — 2FA-gated admin profile & password update
- `src/app/api/admin/history/route.ts` — Audit log feed
- `src/app/api/admin/settings/route.ts` — 2FA-gated Maintenance Mode & Live Notification settings
- `src/app/api/admin/settings/mcq-toggle/route.ts` — Global `mcq_enabled` toggle
- `src/app/api/admin/users/route.ts` — User listing + search *(remove `orders` join for LMS)*
- `src/app/api/admin/analytics/route.ts` — Dashboard KPIs *(remove e-commerce metrics for LMS)*
- `src/app/api/admin/upload/route.ts` — Image upload to `products` bucket *(adapt to separate LMS asset bucket if adding question images later)*

### MCQ Admin APIs
- `src/app/api/admin/mcq/topics/route.ts` — Recursive topics/subtopics CRUD
- `src/app/api/admin/mcq/chapters/route.ts` — Chapters CRUD + cascade delete
- `src/app/api/admin/mcq/mediums/route.ts` — Language mediums CRUD
- `src/app/api/admin/mcq/chapter-languages/route.ts` — Link/unlink language sets on chapter
- `src/app/api/admin/mcq/questions/route.ts` — List/Edit/Delete single or all questions in a set
- `src/app/api/admin/mcq/import/route.ts` — CSV/JSON/Excel preview & commit + import logging
- `src/app/api/admin/mcq/publish/route.ts` — Publish/Unpublish question sets with version archival
- `src/app/api/admin/mcq/logs/route.ts` — Import history logs
- `src/app/api/admin/mcq/templates/route.ts` — Download sample/blank CSV & JSON templates

### Live Test Admin APIs
- `src/app/api/admin/live-tests/route.ts` — List & create live tests
- `src/app/api/admin/live-tests/toggle/route.ts` — Global `live_test_enabled` toggle
- `src/app/api/admin/live-tests/[testId]/route.ts` — Get/Update/Delete single live test
- `src/app/api/admin/live-tests/[testId]/questions/route.ts` — Add/Edit/Delete single/all live test questions
- `src/app/api/admin/live-tests/[testId]/import/route.ts` — CSV/JSON/Excel preview & commit
- `src/app/api/admin/live-tests/[testId]/publish/route.ts` — Status transition (`draft` | `published` | `closed`)
- `src/app/api/admin/live-tests/[testId]/release-answers/route.ts` — Toggle `answers_released`
- `src/app/api/admin/live-tests/[testId]/results/route.ts` — Ranked results leaderboard
- `src/app/api/admin/live-tests/[testId]/export/route.ts` — Generate `.xlsx` and `.pdf` result exports

### Notes Admin & Public Access APIs
- `src/app/api/admin/notes/route.ts` — List & upload PDFs (`notes` bucket, 50MB max)
- `src/app/api/admin/notes/[id]/route.ts` — Edit metadata/permissions/file & delete note
- `src/app/api/admin/notes/folders/route.ts` — List & create recursive folders
- `src/app/api/admin/notes/folders/[id]/route.ts` — Rename/move & recursive folder deletion
- `src/app/api/notes/route.ts`, `src/app/api/notes/folders/route.ts` — Student read endpoints
- `src/app/api/notes/[id]/preview/route.ts` — Enforces `is_previewable` & `!allow_download` document guard
- `src/app/api/notes/[id]/download/route.ts` — Enforces `allow_download` & increments `download_count`

### Excluded E-Commerce Admin APIs
- `src/app/api/admin/orders/**`, `src/app/api/admin/products/**`, `src/app/api/admin/analytics/revenue/route.ts`

---

## 3. Shared Libraries, Guards, Contexts & Components

### Core Business Logic & Security (`src/lib/` & `src/proxy.ts`)
- `src/proxy.ts` — Edge/Node request proxy (rate limit, maintenance rewrite, route auth guards, security headers)
- `src/lib/admin-guard.ts` — `verifyAdminAccess`, `requireAdmin`, `verifyAdmin2FA`, HMAC session sign/verify
- `src/lib/student-auth.ts` — `resolveStudentAuth` (auto-provisions `users` on OAuth)
- `src/lib/totp.ts` — Pure crypto RFC 4648/4226 TOTP generator, verifier & URI builder
- `src/lib/audit.ts` — `logAdminAction` writer to `admin_audit_logs`
- `src/lib/mcq-importer.ts` — Quote-aware CSV parser, JSON/Excel parser, normalization, validation, duplicate check, templates
- `src/lib/db.ts` — Singleton `postgres` pooler client (Next.js server-only; Flutter uses Supabase client + Edge Functions)
- `src/lib/mcq-cache.ts` & `src/lib/live-test-cache.ts` — 5s TTL server caches for global feature flags
- `src/lib/api-cache.ts` — Client-side LRU + sessionStorage stale-while-revalidate cache
- `src/lib/browser-location.ts` — Optional geolocation/location header helper for audit logs
- `src/utils/supabase/{client,server,middleware}.ts` — `@supabase/ssr` helpers

### Shared Components & Contexts
- `src/components/admin/AdminUI.tsx` — `AdminCard`, `StatCard`, `PageHeader`, `Badge`, `EmptyState`, `AdminTable`, `Modal`, `Switch`, `useAutoRefresh`
- `src/components/admin/Admin2FAModal.tsx` — 6-digit TOTP verification dialog
- `src/components/admin/McqToggleCard.tsx` — Global MCQ toggle card
- `src/components/notes/PdfViewerModal.tsx` + `src/app/notes/NotesClient.tsx` — In-app PDF.js canvas viewer & permission UI
- `src/contexts/AuthContext.tsx`, `McqEnabledContext.tsx`, `LiveTestEnabledContext.tsx`, `ToastContext.tsx`
- Excluded e-commerce components/contexts: `ImageUpload.tsx`, `PostalSlipCard.tsx`, `ProductMediumsEditor.tsx`, `CartContext.tsx`, `WishlistContext.tsx`, `razorpay.ts`
