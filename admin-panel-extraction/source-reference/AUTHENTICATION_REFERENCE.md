# Authentication, Authorization & 2FA Reference

> **Source Scope:** Verified from `src/lib/admin-guard.ts`, `src/lib/student-auth.ts`, `src/lib/totp.ts`, `src/lib/audit.ts`, `src/proxy.ts`, `src/utils/supabase/middleware.ts`, `src/utils/supabase/server.ts`, `src/utils/supabase/client.ts`, `src/contexts/AuthContext.tsx`, `src/components/admin/Admin2FAModal.tsx`, `src/app/api/auth/*`, `src/app/api/admin/2fa/route.ts`, and `src/app/admin/profile/page.tsx`.

---

## 1. Hybrid Authentication Model

The existing system supports **two login methods** reconciled into a single `public.users` record (`role`: `'admin'` | `'customer'`):

1. **Email/Password & Mobile/Email Login (`POST /api/auth/login`)**:
   - Accepts `identifier` (or `email`) and `password`.
   - Looks up `users` where `LOWER(email) = LOWER(identifier)` OR `phone = identifier`.
   - Verifies password with `bcryptjs` (`bcrypt.compare`) against `users.password_hash`.
   - Issues two cookies on success:
     - `tep_session`: HTTP-only, `SameSite=Lax`, `Secure` in production, 30-day expiry. Contains HMAC-SHA256 signed payload (`base64url(JSON).signature`).
     - `tep_user_role`: Readable cookie (`user.role || 'customer'`) for client/proxy routing hints.
   - Returns `{ user: { id, name, email, phone, role, image } }`.

2. **Registration (`POST /api/auth/register`)**:
   - Accepts `name`, `email`, `phone`, `password`.
   - Inserts into `users` with hardcoded `role = 'customer'` (admin creation is never exposed via signup) and bcrypt hash (`cost = 10`).
   - Also attempts background creation of corresponding Supabase Auth user (`supabase.auth.signUp`).

3. **Google OAuth Sync (`POST /api/auth/sync` + `src/contexts/AuthContext.tsx`)**:
   - After Supabase Google OAuth redirects back, `AuthContext` obtains the Supabase Auth user (`supabase.auth.getUser()` / `onAuthStateChange`) and calls `POST /api/auth/sync`.
   - `/api/auth/sync` verifies the Supabase Auth session (`createClient().auth.getUser()`), finds or creates the `users` row (`role = 'customer'` by default), refreshes `tep_user_id` and `tep_user_role` cookies, and **if `users.role === 'admin'`**, also mints the HMAC `tep_session` cookie.

4. **Session Hydration & Logout**:
   - `GET /api/auth/me`: Reads `tep_session` first; falls back to Supabase Auth `getUser()` and queries `public.users`. Does not trust client cookies alone unless verified or backed by Supabase Auth.
   - `POST /api/auth/logout`: Clears `tep_session` and `tep_user_role` cookies. Client `AuthContext.logout()` also clears `localStorage` key `'tenali_user'` and `document.cookie` entries `tep_user_id` / `tep_user_role`.

---

## 2. How the System Distinguishes Admin vs. Student

- **Authoritative Source of Truth:** `public.users.role === 'admin'` in PostgreSQL (`'customer'` represents all students/non-admin users).
- **Optimistic UI Hint (`src/contexts/AuthContext.tsx`)**: Client state tracks `isAdmin: user?.role === 'admin'`. For optimistic initial render during Google OAuth hydration before `/api/auth/sync` returns, `AuthContext` checks two known admin emails, **but all server authorization strictly ignores client assertions and checks PostgreSQL `users.role = 'admin'`**.

---

## 3. Server-Side Admin Guard (`src/lib/admin-guard.ts`)

### 3.1 HMAC Session Token
- `createSignedSessionToken(user)`: Signs JSON `{ id, email, role, exp }` (`Date.now() + 30 days`) using Node `crypto.createHmac('sha256', SECRET)` where `SECRET` comes from `process.env.ADMIN_SESSION_SECRET` (or `process.env.NEXTAUTH_SECRET`).
- `verifySignedSessionToken(token)`: Splits `encoded.sig`, verifies constant-time length + `crypto.timingSafeEqual`, checks `payload.exp > Date.now()`.

### 3.2 `verifyAdminAccess(request): Promise<AdminAuthResult>`
Resolution waterfall executed on admin API routes:
1. Check `tep_session` cookie via `verifySignedSessionToken`:
   - If `payload.role === 'admin'` -> returns `{ authorized: true, user: { id, email, role: 'admin' } }`.
2. In-memory TTL cache (`adminCache`, 60-second TTL) keyed by resolved user ID (`id:${userId}` or `email:${email}`):
   - Avoids repeated DB round-trips across rapid dashboard polls.
3. Check Supabase Auth session (`createClient().auth.getUser()`):
   - Queries `SELECT id, email, name, role FROM users WHERE (id = ${id} OR LOWER(email) = LOWER(${email})) AND role = 'admin'`.
4. Fallback header/cookie resolution (`x-user-id`, `tep_user_id` cookie, `adminId` searchParam/header):
   - Always re-verified against PostgreSQL `WHERE id = ${id} AND role = 'admin'`.
5. Failure returns `{ authorized: false, error: ..., status: 401 | 403 }`.

### 3.3 `requireAdmin(request)`
- Calls `verifyAdminAccess(request)` and immediately throws/returns a `401`/`403` `NextResponse` when unauthorized.

---

## 4. Proxy / Middleware Route Protection (`src/proxy.ts` + `src/utils/supabase/middleware.ts`)

Next.js 16 uses `src/proxy.ts` (`export async function proxy(request: NextRequest)`) for request interception:

1. **In-Memory Sliding Rate Limiter (`RATE_LIMIT_RULES`)**:
   - `/api/auth/login` -> 15 req / 60s per IP
   - `/api/auth/register` -> 10 req / 60s per IP
   - `/api/admin` -> 120 req / 60s per IP
   - *(Includes e-commerce checkout/payment limits omitted from LMS)*
2. **Maintenance Mode Gate**:
   - Reads `tep_maintenance` cookie (`'true'`).
   - Allows `/admin`, `/api`, `/login`, and static assets; rewrites all other public routes to `/maintenance`.
3. **Admin Page & API Protection**:
   - `/admin/*`: Requires `tep_session` (valid HMAC with `role === 'admin'`) OR `tep_user_role === 'admin'`; otherwise redirects to `/login?redirect=<pathname>`.
   - `/api/admin/*`: Requires `tep_session` OR `tep_user_role === 'admin'` OR `x-user-id` header OR Supabase Auth cookie (`sb-*-auth-token`); otherwise returns `401 Unauthorized`. *(Every admin route handler then performs strict DB verification via `verifyAdminAccess`.)*
4. **Student Protected Routes**:
   - `/mcq/*` & `/checkout/*`: Require session (`tep_session`, `tep_user_id`, or `sb-*-auth-token`); redirects unauthenticated visitors to `/login`.
5. **Security Headers (`applySecurityHeaders`)**:
   - Sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, CSP, and conditionally `X-Frame-Options: DENY` (relaxed to `SAMEORIGIN` on `/api/notes/*/preview` so the in-app PDF fallback `<iframe>` works).
6. **Supabase Session Refresh (`src/utils/supabase/middleware.ts`)**:
   - Calls `supabase.auth.getUser()` with a `600ms` timeout race to keep cookies fresh without blocking page loads if Supabase Auth is slow.

> [!NOTE]
> `src/app/admin/layout.tsx` also applies a client-side guard on mount (`!loading && (!user || !isAdmin) -> router.replace('/login?redirect=/admin')`), showing a verification spinner while `AuthContext` loads.

---

## 5. Student Authentication Resolution (`src/lib/student-auth.ts`)

Used by student MCQ test/attempt endpoints (`/api/mcq/test/[setId]`, `/api/mcq/test/[setId]/submit`, `/api/mcq/attempts/[attemptId]`):
- `resolveStudentAuth(request)`:
  1. Checks `x-user-id` header -> verifies row in `public.users`.
  2. Checks `tep_session` HMAC cookie -> verifies row in `public.users`.
  3. Checks `tep_user_id` cookie -> verifies row in `public.users`.
  4. Checks Supabase Auth `createClient().auth.getUser()` -> if found in `users` returns it; if missing from `public.users` (first-time OAuth user), **auto-provisions** a `users` record (`role = 'customer'`) using `ON CONFLICT (email) DO UPDATE` and returns `{ userId, email, name }`.

---

## 6. Two-Factor Authentication (TOTP) & Audit Logging

### 6.1 RFC 4648 / RFC 4226 TOTP (`src/lib/totp.ts` & `src/app/api/admin/2fa/route.ts`)
- Stored in `admin_2fa_secrets` under fixed `user_id = 'master_admin_2fa'`.
- `generateTotpSecret(length = 20)`: Cryptographically random Base32 secret.
- `verifyTotpCode(secret, token, window = 1)`: 6-digit HMAC-SHA1 over 30-second steps, checking `step - 1`, `step`, `step + 1` (±30s clock skew tolerance).
- `getTotpUri(secret, accountName, issuer)`: Builds `otpauth://totp/Tenali%20Exams%20Admin:...` URI for QR rendering (`qrcode` library on `/admin/profile`).
- **2FA Setup/Reset (`/api/admin/2fa`)**:
  - `GET`: Verifies admin access -> fetches or auto-generates secret -> returns `{ enabled, qrCodeDataUrl, manualKey }`.
  - `DELETE`: Verifies admin access -> deletes `'master_admin_2fa'` row so a new QR secret is provisioned on next `GET`.

### 6.2 Enforcement Coverage Gap (Important Audit Finding)
- **`verifyAdmin2FA(request)` (`src/lib/admin-guard.ts`)** reads `x-totp-code` header (or query param), checks `admin_2fa_secrets`, and validates the 6-digit code.
- **Currently 2FA-Gated Routes**:
  - `PUT /api/admin/settings`
  - `PUT /api/admin/profile`
  - Product/Order routes (e-commerce)
- **Currently NOT 2FA-Gated (Session-Only via `verifyAdminAccess`)**:
  - All `/api/admin/mcq/*` endpoints (including `publish` and question deletion)
  - All `/api/admin/live-tests/*` endpoints
  - All `/api/admin/notes/*` endpoints
  - `/api/admin/settings/mcq-toggle` and `/api/admin/live-tests/toggle`

### 6.3 Admin Audit Logging (`src/lib/audit.ts`)
- `logAdminAction(params)`: Inserts `{ admin_id, admin_name, admin_email, action_type, target_type, target_name, previous_value (jsonb), new_value (jsonb), totp_verified, ip_address, location_name }` into `admin_audit_logs`.
- Reads location from `x-admin-location` header (default `'Tenali, Andhra Pradesh, India'`).
- Read back via `GET /api/admin/history` and rendered on `/admin/history`.
- **LMS Recommendation**: Extend audit logging + optional 2FA confirmation to destructive LMS actions (deleting topic trees/folders, releasing live test keys, bulk replacing MCQ sets).
