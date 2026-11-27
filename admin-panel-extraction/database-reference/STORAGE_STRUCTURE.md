# Supabase Storage & File Delivery Structure

> **Audit Basis:** Live `storage.buckets` query, `scripts/setup-storage.mjs`, `src/app/api/admin/upload/route.ts`, `src/app/api/admin/notes/route.ts`, `src/app/api/admin/notes/[id]/route.ts`, `src/app/api/notes/[id]/preview/route.ts`, and `src/app/api/notes/[id]/download/route.ts`.

---

## 1. Existing Storage Buckets

Querying `storage.buckets` on the live Supabase project shows **2 buckets**:

| Bucket ID / Name | `public` | `file_size_limit` | `allowed_mime_types` | LMS Usage |
|---|---|---|---|---|
| `notes` | `true` | `null` (API enforces `50 MB`) | `null` (API enforces `.pdf` / `application/pdf`) | **Include in LMS** — PDF study notes |
| `products` | `true` | `10485760` (10 MB) | `["image/png","image/jpeg","image/jpg","image/webp"]` | **Exclude from LMS** — E-commerce book images |

*(Note: `src/app/api/admin/upload/route.ts` uses the `products` bucket and optionally `uploads` folder for product/MCQ images, though current MCQ CSV/JSON importer is text-based and has no image field.)*

---

## 2. How Notes PDFs Are Stored Today

### 2.1 Upload Flow (`POST /api/admin/notes` and `PUT /api/admin/notes/[id]`)
1. Client sends `multipart/form-data` containing `file`, `title`, `description`, `folder_id`, `allow_download`, `is_previewable`.
2. Backend validates:
   - File must be present (on `POST`), extension `.pdf` or `file.type === 'application/pdf'`.
   - Size cap: `<= 50 * 1024 * 1024` bytes (`50 MB`).
3. File is sanitized into a unique object key:
   ```ts
   const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
   const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
   const storageFileName = `note-${uniqueId}-${safeName}`;
   ```
4. Primary upload target: **Supabase Storage `notes` bucket**:
   ```ts
   supabase.storage.from('notes').upload(storageFileName, buffer, {
     contentType: 'application/pdf',
     upsert: true,
   });
   ```
   After upload, the backend calls:
   ```ts
   supabase.storage.from('notes').getPublicUrl(data.path);
   ```
   and persists `pdf_url = urlData.publicUrl` inside `pdf_materials`.
5. **Local Filesystem Fallback** (dev / self-hosted Node.js only):
   - If Supabase Storage fails **and** `!isServerlessRuntime` (`!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME`), writes to `public/uploads/notes/${storageFileName}` and stores `pdf_url = '/uploads/notes/' + storageFileName`.
6. **File Size Formatting**:
   - Computed server-side and saved to `pdf_materials.file_size` as human-readable string (`'1.24 MB'` if >= 1 MB, otherwise `'512 KB'`).

### 2.2 Delete Flow (`DELETE /api/admin/notes/[id]`)
1. Queries `pdf_materials` by `id`.
2. Deletes the DB row `DELETE FROM pdf_materials WHERE id = ...`.
3. Best-effort cleanup of the backing file:
   - If `pdf_url.startsWith('/uploads/notes/')`: deletes from local disk (`fs.promises.unlink`).
   - If `pdf_url.includes('/storage/v1/object/public/notes/')`: extracts the object filename after `/notes/` and calls `supabase.storage.from('notes').remove([fileName])`.
   - If `note_folders` is deleted via `DELETE /api/admin/notes/folders/[id]`: recursively collects descendant folders and **deletes all notes in those folders first** (including cleaning up storage objects) before deleting the folders.

---

## 3. Security Audit of Current `notes` Storage Permissions

> [!CAUTION]
> **Critical Access-Control Gap for LMS Migration:**
> - The `notes` bucket currently has **`public = true`**, and `pdf_materials.pdf_url` stores the **unprotected Supabase Public URL** (`.../storage/v1/object/public/notes/note-...pdf`).
> - Meanwhile, `GET /api/notes` selects `p.*` (including `pdf_url`) and sends it to the client!
> - Therefore, in the current web architecture, `allow_download = false` and `is_previewable = false` are enforced at the Next.js API proxy (`/api/notes/[id]/preview`, `/api/notes/[id]/download`) and React UI (`NotesClient.tsx`, `PdfViewerModal.tsx`), **not** at the storage layer. Anyone inspecting the API JSON response receives the direct public Storage URL.

---

## 4. Target Storage Architecture for Flutter LMS

To properly enforce all 4 Preview/Download combinations (`allow_download` × `is_previewable`) in a native Android Flutter LMS:

1. **Make the `notes` bucket PRIVATE (`public = false`)** in Supabase Storage.
2. Store only the internal object path (`storage_path`, e.g., `note-173...pdf` or `folders/<folder_id>/note-...pdf`) in `pdf_materials` rather than exposing a public URL directly to students.
3. Add `storage.objects` RLS:
   - Only admins (`public.is_admin()`) or `service_role` can `INSERT` / `UPDATE` / `DELETE` objects in `bucket_id = 'notes'`.
   - Students (`authenticated`) should **NOT** get direct wildcard `SELECT` on `storage.objects` in `notes` (otherwise they could download files with `allow_download = false`).
4. Serve files exclusively through a **Supabase Edge Function** (or authenticated API proxy) that reads `pdf_materials` permissions before streaming or signing:
   - **Preview Request** -> Reject `403 PREVIEW_DISABLED` unless `is_previewable === true`. Return short-lived **Signed URL** (`createSignedUrl(path, 60)` = 60 seconds) OR stream bytes to Flutter's in-memory PDF viewer (`pdfrx` / `pdfx`), preventing local file caching when `allow_download === false`.
   - **Download Request** -> Reject `403 DOWNLOAD_DISABLED` unless `allow_download === true`. Increment `download_count`, issue signed URL / download stream, and save to device Downloads via Flutter.
5. On Android additionally, apply `FlutterWindowManager` / `WindowManager.LayoutParams.FLAG_SECURE` while viewing `allow_download = false` PDFs to block screenshots and screen recording.
