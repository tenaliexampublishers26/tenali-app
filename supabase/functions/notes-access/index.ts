import { corsHeaders, getServiceClient, jsonResponse, verifyUser } from '../_shared/admin_auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const user = await verifyUser(req);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(req.url);
  let noteId = url.searchParams.get('noteId') ?? '';
  let mode = url.searchParams.get('mode') ?? 'preview';

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    noteId = String(body?.noteId ?? noteId);
    mode = String(body?.mode ?? mode);
  }

  if (!noteId) {
    return jsonResponse({ error: 'noteId is required' }, 400);
  }

  const supabase = getServiceClient();
  const { data: note, error } = await supabase
    .from('pdf_materials')
    .select('id, title, storage_path, pdf_url, is_previewable, allow_download, download_count')
    .eq('id', noteId)
    .maybeSingle();

  if (error || !note) {
    return jsonResponse({ error: 'Note not found' }, 404);
  }

  const storagePath =
    (note.storage_path as string | null)?.trim() ||
    (note.pdf_url && String(note.pdf_url).includes('/notes/')
      ? String(note.pdf_url).split('/notes/').pop() ?? ''
      : '');

  if (!storagePath) {
    return jsonResponse({ error: 'Storage path missing for note' }, 404);
  }

  if (mode === 'preview') {
    if (!note.is_previewable) {
      return jsonResponse({ error: 'Preview is disabled by administrator', code: 'PREVIEW_DISABLED' }, 403);
    }

    if (!note.allow_download) {
      const { data: blob, error: dlErr } = await supabase.storage.from('notes').download(storagePath);
      if (dlErr || !blob) {
        return jsonResponse({ error: dlErr?.message ?? 'Could not stream PDF' }, 500);
      }
      const bytes = await blob.arrayBuffer();
      return new Response(bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('notes')
      .createSignedUrl(storagePath, 60);
    if (signErr || !signed) {
      return jsonResponse({ error: signErr?.message ?? 'Failed to sign preview URL' }, 500);
    }
    return jsonResponse({ signedUrl: signed.signedUrl, allowDownload: true });
  }

  if (mode === 'download') {
    if (!note.allow_download) {
      return jsonResponse({ error: 'Download is disabled by administrator', code: 'DOWNLOAD_DISABLED' }, 403);
    }

    await supabase
      .from('pdf_materials')
      .update({ download_count: (note.download_count ?? 0) + 1 })
      .eq('id', note.id);

    const safeFileName = `${String(note.title).replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
    const { data: signed, error: signErr } = await supabase.storage
      .from('notes')
      .createSignedUrl(storagePath, 60, { download: safeFileName });

    if (signErr || !signed) {
      return jsonResponse({ error: signErr?.message ?? 'Failed to sign download URL' }, 500);
    }
    return jsonResponse({ signedUrl: signed.signedUrl, fileName: safeFileName });
  }

  return jsonResponse({ error: 'Invalid mode (expected preview or download)' }, 400);
});
