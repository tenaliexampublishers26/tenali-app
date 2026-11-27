# Admin UI Pages, Components & State Patterns Reference

> **Source Scope:** Verified from `src/app/admin/**`, `src/components/admin/**`, `src/components/notes/PdfViewerModal.tsx`, `src/contexts/AuthContext.tsx`, and `src/lib/api-cache.ts`.

---

## 1. Admin Navigation Shell (`src/app/admin/layout.tsx`)

### Sidebar Menu & Routes (`MENU` Array)
| Route | Label | Icon (`lucide-react`) | Flutter LMS Scope |
|---|---|---|---|
| `/admin` | Dashboard | `LayoutDashboard` | **Rebuild for LMS KPIs** (replace e-commerce stats) |
| `/admin/orders` | Orders | `ShoppingBag` | **EXCLUDED** (E-commerce) |
| `/admin/products` | Products | `Package` | **EXCLUDED** (E-commerce) |
| `/admin/live-tests` | Live Tests | `Radio` | **INCLUDE** |
| `/admin/mcq` | MCQ & Topics | `HelpCircle` | **INCLUDE** (plus `/admin/mcq/import` redirect) |
| `/admin/notes` | Notes Management | `FileText` | **INCLUDE** |
| `/admin/profile` | Admin Profile | `User` | **INCLUDE** (with 2FA setup) |
| `/admin/users` | Users | `Users` | **INCLUDE & ADAPT** (show quiz/test stats instead of orders) |
| `/admin/history` | Audit History | `History` | **INCLUDE** |
| `/admin/settings` | Settings | `Settings` | **INCLUDE** |

### Layout Features
- **Client Role Gate**: Waits for `useAuth()`; redirects non-admins to `/login?redirect=/admin`.
- **Dark Mode**: `localStorage.getItem('tenali_admin_dark')` toggles `document.documentElement.classList.toggle('dark')`.
- **Live Clock & Store Shortcut**: Top bar displays live date/time, `View Store` external link, and theme toggle.
- **Responsive Navigation**: Desktop fixed left sidebar + mobile draggable drawer (`AnimatePresence` / `motion`).

---

## 2. Reusable Admin UI Primitives (`src/components/admin/AdminUI.tsx`)

- **Motion Springs**: `SPRING_UI`, `SPRING_PRESS`, `SPRING_GENTLE`, `LIST_VARIANTS`, `ITEM_VARIANTS` (`motion/react`).
- **UI Components**:
  - `AdminCard`: Rounded bordered card wrapper (`p`, `hover`, `className`).
  - `StatCard`: KPI tile with icon box, trend pill (`up`/`down`), numeric `value`, and optional sub-label.
  - `PageHeader`: Standardized title, subtitle, and right-aligned `actions` slot.
  - `Badge`: Semantic color status badges (`green`, `amber`, `red`, `blue`, `purple`, `gray`).
  - `EmptyState`: Centered icon, heading, description, and CTA button.
  - `AdminTable`: Responsive table container.
  - `Modal`: Accessible backdrop + spring dialog container.
  - `Switch`: Animated toggle switch (`value`, `onToggle`, optional `iconOn` / `iconOff`).
- **Polling Hook (`useAutoRefresh`)**:
  - Executes `fetchFn` on interval **only when `document.visibilityState === 'visible'`**, immediately refreshing when the tab regains focus (`visibilitychange`). Used on Dashboard (8s) and Users (60s).

---

## 3. Shared Admin & Notes Components

### 3.1 `Admin2FAModal` (`src/components/admin/Admin2FAModal.tsx`)
- Reusable confirmation dialog used before saving `/admin/settings` and `/admin/profile`.
- Renders a 6-digit numeric OTP input (`inputMode="numeric"`, `maxLength={6}`) with paste support, auto-focus, Enter submit, and async verification callback `onVerify(code)`.
- Captures optional `x-admin-location` header via `src/lib/browser-location.ts` before invoking sensitive APIs.

### 3.2 `McqToggleCard` (`src/components/admin/McqToggleCard.tsx`)
- Standalone card rendered at the top of `/admin` and `/admin/mcq`.
- Fetches `GET /api/admin/settings/mcq-toggle`, displays live `ENABLED / DISABLED` status pill (`COMING SOON` notice when disabled), and calls `PUT /api/admin/settings/mcq-toggle` on toggle.

### 3.3 `PdfViewerModal` (`src/components/notes/PdfViewerModal.tsx`)
- Client-side PDF reader using **`pdfjs-dist` (`pdfjsLib.getDocument`)** rendering page-by-page onto an HTML `<canvas>` (`window.devicePixelRatio` crisp scaling) with fallback `<iframe>` if PDF.js fails.
- Enforces client-side restrictions when `!note.allow_download`:
  - Disables right-click context menu (`onContextMenu`).
  - Intercepts `Ctrl/Cmd + S` and `Ctrl/Cmd + P` (`preventDefault()`).
  - Hides header Download button and shows `View Only` lock pill + warning banner.
  - Supports pinch-to-zoom (`0.5x`–`3.0x`), swipe page navigation, and keyboard arrows (`ArrowLeft`/`ArrowRight`/`+`/`-`/`0`).

### 3.4 E-Commerce-Only Admin Components (Exclude from LMS)
- `src/components/admin/ImageUpload.tsx` (product image uploader)
- `src/components/admin/PostalSlipCard.tsx` (India Post dispatch slip generator)
- `src/components/admin/ProductMediumsEditor.tsx` (book price/language variants)
- `src/app/admin/orders/page.tsx`, `src/app/admin/products/**`

---

## 4. Other Admin Pages (Users, Settings, History, Profile)

### 4.1 Dashboard (`src/app/admin/page.tsx`)
- Currently combines `McqToggleCard` (LMS) with e-commerce KPIs (`Total Revenue`, `Total Orders`, `Products Sold`, `Total Users`, 7-day sales chart, Supabase realtime listener on `orders`).
- For Flutter LMS, keep `McqToggleCard` + Live Test status card + Students/Attempts/Notes KPIs and remove all revenue/order charts.

### 4.2 Users (`src/app/admin/users/page.tsx`)
- Fetches `GET /api/admin/users?search=...` (`useAutoRefresh` every 60s).
- Client search filters by `name`, `email`, `phone`, `role`.
- **Important Gap Found**: Clicking **View Details** opens a modal displaying the user's **e-commerce `orders` history only** (`orders` & `order_items`). There is currently no query/UI for `mcq_attempts`, `live_test_submissions`, or account suspend/ban actions. For Flutter LMS, replace the order history block with MCQ Practice History, Live Test Scores/Ranks, and Bookmarks summary.

### 4.3 System Settings (`src/app/admin/settings/page.tsx`)
- Loads `GET /api/admin/settings`.
- Controls:
  1. **Live Flash Notification Marquee**: `enabled` switch, scrolling `text`, optional `link`.
  2. **Maintenance Mode**: Global `maintenanceMode` switch (`PUT /api/admin/settings` sets `tep_maintenance` cookie and DB `settings.maintenance_mode`).
- Clicking **Save Settings** opens `Admin2FAModal` -> sends `PUT /api/admin/settings` with `x-totp-code` header.

### 4.4 Audit History (`src/app/admin/history/page.tsx`)
- Loads `GET /api/admin/history` (latest 100 rows from `admin_audit_logs`).
- Filterable by search term and `targetType` (`all`, `product`, `order`, `settings`, `profile` — filter options should be adapted to `settings`, `profile`, `mcq`, `live_test`, `notes` in LMS).
- Expandable rows render side-by-side JSON diff (`previous_value` vs. `new_value`), TOTP badge, IP address, and location stamp.

### 4.5 Admin Profile & 2FA Management (`src/app/admin/profile/page.tsx`)
- Edits current admin's `name`, `phone`, and optional password change (protected by `Admin2FAModal`).
- Displays live **Google Authenticator QR Code** fetched from `GET /api/admin/2fa` + manual Base32 secret copy button + **Reset 2FA Secret** (`DELETE /api/admin/2fa`).
