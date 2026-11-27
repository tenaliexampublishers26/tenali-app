import {
  corsHeaders,
  jsonResponse,
  verifyAdmin,
  writeAuditLog,
} from '../_shared/admin_auth.ts';

function extractStoragePath(storagePath?: string | null, pdfUrl?: string | null): string | null {
  if (storagePath && storagePath.trim().length > 0) {
    return storagePath.trim();
  }
  if (pdfUrl && pdfUrl.includes('/notes/')) {
    return pdfUrl.split('/notes/').pop() ?? null;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { supabase, user } = auth;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? '');

  if (action === 'delete_note') {
    const noteId = String(body?.noteId ?? '');
    const { data: note } = await supabase
      .from('pdf_materials')
      .select('id, title, storage_path, pdf_url')
      .eq('id', noteId)
      .maybeSingle();

    if (!note) return jsonResponse({ error: 'Note not found' }, 404);

    await supabase.from('pdf_materials').delete().eq('id', noteId);
    const key = extractStoragePath(note.storage_path, note.pdf_url);
    if (key) {
      await supabase.storage.from('notes').remove([key]);
    }

    await writeAuditLog({
      supabase,
      admin: user,
      actionType: 'DELETE_NOTE',
      targetType: 'notes',
      targetName: note.title,
      previousValue: note,
      req,
    });
    return jsonResponse({ deleted: true });
  }

  if (action === 'delete_folder_tree') {
    const folderId = String(body?.folderId ?? '');
    const { data: deletedRows, error } = await supabase.rpc('delete_note_folder_tree', {
      p_folder_id: folderId,
    });
    if (error) return jsonResponse({ error: error.message }, 400);

    const keys: string[] = [];
    for (const row of (deletedRows ?? []) as Array<{
      deleted_storage_path?: string | null;
      deleted_pdf_url?: string | null;
    }>) {
      const k = extractStoragePath(row.deleted_storage_path, row.deleted_pdf_url);
      if (k) keys.push(k);
    }
    if (keys.length > 0) {
      await supabase.storage.from('notes').remove(keys);
    }

    await writeAuditLog({
      supabase,
      admin: user,
      actionType: 'DELETE_NOTE_FOLDER_TREE',
      targetType: 'notes',
      targetName: folderId,
      previousValue: { removedFiles: keys.length },
      req,
    });
    return jsonResponse({ deleted: true, removedFiles: keys.length });
  }

  if (action === 'delete_topic_tree') {
    const topicId = String(body?.topicId ?? '');
    const { data: count, error } = await supabase.rpc('delete_mcq_topic_tree', {
      p_topic_id: topicId,
    });
    if (error) return jsonResponse({ error: error.message }, 400);

    await writeAuditLog({
      supabase,
      admin: user,
      actionType: 'DELETE_MCQ_TOPIC_TREE',
      targetType: 'mcq',
      targetName: topicId,
      previousValue: { deletedTopics: count },
      req,
    });
    return jsonResponse({ deleted: true, deletedTopics: count });
  }

  if (action === 'release_live_test_answers') {
    const testId = String(body?.testId ?? '');
    const answersReleased = Boolean(body?.answersReleased);

    const { data: test } = await supabase
      .from('live_tests')
      .select('id, title, status, answers_released')
      .eq('id', testId)
      .maybeSingle();

    if (!test) return jsonResponse({ error: 'Live test not found' }, 404);

    await supabase
      .from('live_tests')
      .update({ answers_released: answersReleased, updated_at: new Date().toISOString() })
      .eq('id', testId);

    await writeAuditLog({
      supabase,
      admin: user,
      actionType: 'RELEASE_LIVE_TEST_ANSWERS',
      targetType: 'live_test',
      targetName: test.title,
      previousValue: { answers_released: test.answers_released },
      newValue: { answers_released: answersReleased },
      req,
    });
    return jsonResponse({ updated: true, answersReleased });
  }

  return jsonResponse({ error: 'Unsupported action' }, 400);
});
