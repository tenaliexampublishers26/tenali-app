import {
  corsHeaders,
  jsonResponse,
  verifyAdmin,
  writeAuditLog,
} from '../_shared/admin_auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status);
  }
  const { supabase, user } = auth;

  if (req.method !== 'PUT') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? '');

  if (action === 'update_settings') {
    const entries: Array<{ key: string; value: string }> = [];
    if (body.maintenanceMode !== undefined) {
      entries.push({ key: 'maintenance_mode', value: String(Boolean(body.maintenanceMode)) });
    }
    if (body.mcqEnabled !== undefined) {
      entries.push({ key: 'mcq_enabled', value: String(Boolean(body.mcqEnabled)) });
    }
    if (body.liveTestEnabled !== undefined) {
      entries.push({ key: 'live_test_enabled', value: String(Boolean(body.liveTestEnabled)) });
    }
    if (body.liveNotificationEnabled !== undefined) {
      entries.push({
        key: 'live_notification_enabled',
        value: String(Boolean(body.liveNotificationEnabled)),
      });
    }
    if (body.liveNotificationText !== undefined) {
      entries.push({ key: 'live_notification_text', value: String(body.liveNotificationText) });
    }
    if (body.liveNotificationLink !== undefined) {
      entries.push({ key: 'live_notification_link', value: String(body.liveNotificationLink) });
    }

    const { data: prevRows } = await supabase.from('settings').select('key, value');
    const prevMap = Object.fromEntries((prevRows ?? []).map((r) => [r.key, r.value]));

    if (entries.length > 0) {
      await supabase.from('settings').upsert(
        entries.map((e) => ({
          key: e.key,
          value: e.value,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'key' },
      );
    }

    await writeAuditLog({
      supabase,
      admin: user,
      actionType: 'UPDATE_SETTINGS',
      targetType: 'settings',
      targetName: 'Global LMS Settings',
      previousValue: prevMap,
      newValue: Object.fromEntries(entries.map((e) => [e.key, e.value])),
      req,
    });

    return jsonResponse({ updated: true });
  }

  if (action === 'update_profile') {
    const name = String(body?.name ?? user.name ?? '').trim();
    const phone = String(body?.phone ?? user.phone ?? '').trim();
    const newPassword = body?.newPassword ? String(body.newPassword) : null;

    const prevSnapshot = { name: user.name, phone: user.phone };
    await supabase
      .from('users')
      .update({ name, phone, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (newPassword && newPassword.length >= 6) {
      await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    }

    await writeAuditLog({
      supabase,
      admin: user,
      actionType: 'UPDATE_PROFILE',
      targetType: 'profile',
      targetName: user.email ?? user.id,
      previousValue: prevSnapshot,
      newValue: { name, phone, passwordChanged: Boolean(newPassword) },
      req,
    });

    return jsonResponse({ updated: true });
  }

  return jsonResponse({ error: 'Unsupported action' }, 400);
});
