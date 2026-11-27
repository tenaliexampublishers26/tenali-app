import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-location',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function verifyUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function verifyAdmin(req: Request) {
  const authUser = await verifyUser(req);
  if (!authUser) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const supabase = getServiceClient();
  const { data: userRow, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error || !userRow || userRow.role !== 'admin') {
    return { ok: false as const, status: 403, error: 'Forbidden: Admin privileges required' };
  }

  return { ok: true as const, user: userRow, supabase };
}

export async function writeAuditLog(params: {
  supabase: ReturnType<typeof getServiceClient>;
  admin: { id: string; name?: string | null; email?: string | null };
  actionType: string;
  targetType: string;
  targetName: string;
  previousValue?: unknown;
  newValue?: unknown;
  req?: Request;
}) {
  const location =
    params.req?.headers.get('x-admin-location') ?? 'Tenali, Andhra Pradesh, India';
  const ip =
    params.req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'mobile-app';

  await params.supabase.from('admin_audit_logs').insert({
    admin_id: params.admin.id,
    admin_name: params.admin.name ?? 'Admin',
    admin_email: params.admin.email ?? '',
    action_type: params.actionType,
    target_type: params.targetType,
    target_name: params.targetName,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
    totp_verified: false,
    ip_address: ip,
    location_name: location,
  });
}
