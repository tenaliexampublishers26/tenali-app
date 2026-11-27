# Notes Management & DRM Access Control Reference

> **Source Scope:** Verified from `src/app/admin/notes/page.tsx`, `src/app/api/admin/notes/**`, `src/app/api/notes/**`, `src/app/notes/NotesClient.tsx`, and `src/components/notes/PdfViewerModal.tsx`.

---

## 1. Hierarchical Folder Organization (`note_folders`)

- **Structure**: Self-referential folder tree (`id`, `name`, `parent_id`, `created_at`, `updated_at`).
- **Root Behavior (`currentFolderId === null`)**:
  - Admin UI starts at the directory root showing Subject Folders with aggregated subfolder count, recursive/direct note count, and formatted total MB size (`parseSizeToBytes` / `formatBytesToMB`).
  - Generic "General" root category dropdowns were removed from Upload and Edit modals; notes belong directly to a chosen `folder_id` (while DB `category_code` stays populated server-side as `'NOTES'` or `'General'` for backward compatibility).
- **3-Dots Folder Action Menu (Verified in `src/app/admin/notes/page.tsx`)**:
  Every folder card exposes a `MoreVertical` 3-dots menu (`openMenuFolderId`) with three actions:
  1. **Rename / Edit** (`openEditFolderModal`) -> `PUT /api/admin/notes/folders/[id]`
  2. **Create Subfolder** (`openCreateFolderModal(folder.id)`) -> `POST /api/admin/notes/folders`
  3. **Delete Folder** (`setPendingDeleteFolder(folder)`) -> opens confirmation modal -> `DELETE /api/admin/notes/folders/[id]`
- **Recursive Folder Deletion (`DELETE /api/admin/notes/folders/[id]`)**:
  - Uses recursive traversal to gather `[targetFolderId, ...allDescendantIds]`.
  - Queries all `pdf_materials` inside those folders, deletes backing files from Supabase Storage (`notes` bucket) or local `/uploads/notes/`, deletes the DB note rows, then deletes the folder rows.

---

## 2. Note CRUD & File Handling

- **Upload (`POST /api/admin/notes`)**:
  - Multipart form fields: `file` (`.pdf`, max 50MB), `title`, `description`, `folder_id`, `allow_download` (default `false`), `is_previewable` (default `true`).
  - Uploads PDF to Supabase Storage `notes` bucket (with `/uploads/notes/` local fallback only outside serverless runtimes).
  - Computes human-readable `file_size` (`MB` / `KB`).
- **Quick Toggle (`PUT /api/admin/notes/[id]`)**:
  - Note rows in Admin UI include an instant optimistic toggle switch (`handleToggleDownload`) for `allow_download` without opening the Edit modal.
- **Edit Modal (`PUT /api/admin/notes/[id]`)**:
  - Modifies `title`, `description`, `folder_id`, **`allow_download`**, **`is_previewable`**, and optionally replaces the PDF file.
- **Quick Move**:
  - Admin can reassign `folder_id` directly from a dedicated Move modal.
- **Delete (`DELETE /api/admin/notes/[id]`)**:
  - Removes `pdf_materials` row and deletes storage object.

---

## 3. Preview & Download Controls: All 4 Combinations

Two independent boolean flags on `pdf_materials` govern access:
- `is_previewable` (`boolean`, default `true`): Controls inline PDF reader access (`/api/notes/[id]/preview`).
- `allow_download` (`boolean`, default `false`): Controls file download access (`/api/notes/[id]/download`) and viewer restrictions.

### Behavior Matrix (Verified Across DB, API & UI)

| Combination | `is_previewable` | `allow_download` | Student API (`/preview` & `/download`) | Student UI (`NotesClient.tsx` & `PdfViewerModal.tsx`) |
|---|---|---|---|---|
| **1. Preview ON + Download ON** | `true` | `true` | `/preview` streams inline `200 OK` (`Cache-Control: no-store`); `/download` increments `download_count` & streams/redirects attachment `200 OK`. | Card shows **Download Available** badge + both **Preview PDF** & **Download** buttons. Modal header enables **Download** button, permits context menu & `Ctrl+S`/`Ctrl+P`. |
| **2. Preview ON + Download OFF** *(Default)* | `true` | `false` | `/preview` streams inline **only** for fetch/iframe (`sec-fetch-dest === 'document'` redirects user back to `/notes`); `/download` returns **`403 DOWNLOAD_DISABLED`**. | Card shows **Preview Only** badge + **Preview PDF** button only + restriction notice banner. Modal shows **View Only** lock badge, hides Download button, blocks right-click (`onContextMenu`), blocks `Ctrl/Cmd + S / P`, renders pages onto `<canvas>` via PDF.js (`#toolbar=0` on fallback iframe). |
| **3. Preview OFF + Download ON** | `false` | `true` | `/preview` returns **`403 PREVIEW_DISABLED`**; `/download` increments `download_count` and delivers file **`200 OK`**. | **Current Web UI Quirk:** `NotesClient.tsx` currently renders the **Preview PDF** button unconditionally (lines 454-462); clicking it opens `PdfViewerModal` which receives `403` from `/preview`, while **Download** button works normally. **In Flutter LMS:** Hide/disable the **Preview** button cleanly when `is_previewable == false` and show only **Download**. |
| **4. Preview OFF + Download OFF** | `false` | `false` | `/preview` returns **`403 PREVIEW_DISABLED`**; `/download` returns **`403 DOWNLOAD_DISABLED`**. | **In Flutter LMS:** Show locked state badge ("Currently restricted by admin") and disable both Preview and Download actions. |

---

## 4. Storage Security Gap & Flutter Enforcement Blueprint

### Current Website Vulnerability
- `storage.buckets` defines `notes` with **`public = true`**.
- `POST /api/admin/notes` persists `supabase.storage.from('notes').getPublicUrl(...)` into `pdf_materials.pdf_url`, and `GET /api/notes` returns `p.*` (exposing `pdf_url`).
- As a result, any user inspecting network traffic to `/api/notes` obtains the public Supabase URL and can download files directly even when `allow_download = false` and `is_previewable = false`.

### How Flutter Android LMS Must Enforce All 4 Combinations Securely
1. **Private Bucket (`public = false`)**: Switch `notes` bucket to private and never expose raw public URLs in student API/PostgREST queries (`SELECT` list must omit raw storage key or keep `pdf_url` unused by clients).
2. **Backend Access Gate (Supabase Edge Function `notes-access`)**:
   - Validates student JWT.
   - Reads `{ is_previewable, allow_download, storage_path }` from `pdf_materials`.
   - **Action = `preview`**: If `!is_previewable` -> return HTTP `403`. Otherwise stream PDF bytes directly (preferable when `!allow_download`, keeping bytes in RAM only) OR return a **60-second signed URL**.
   - **Action = `download`**: If `!allow_download` -> return HTTP `403`. Otherwise atomically increment `download_count` and return a 60-second download signed URL (`download: '<title>.pdf'`).
3. **Android Native Viewer Protections (`allow_download = false`)**:
   - Render via in-memory byte buffer (`Uint8List`) in a Flutter PDF widget without writing a decrypted copy to external/public `Downloads` storage.
   - Enable Android `FLAG_SECURE` on the preview route while `allow_download == false` to block screenshots and screen recording.
