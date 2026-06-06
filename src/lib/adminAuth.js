import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function getSupabaseClient() {
  const adminClient = getAdminSupabase();
  if (adminClient) return adminClient;
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  return null;
}

export async function verifyAdmin(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('[adminAuth] verifyAdmin - authHeader:', authHeader ? 'Present' : 'Missing');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[adminAuth] verifyAdmin - authHeader invalid or missing');
      return false;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('[adminAuth] verifyAdmin - token missing');
      return false;
    }

    const client = getSupabaseClient();
    if (!client) {
      console.log('[adminAuth] verifyAdmin - getSupabaseClient returned null');
      return false;
    }

    // Verificar token com o Supabase Auth
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      console.log('[adminAuth] verifyAdmin - auth.getUser failed, error:', error?.message, 'user:', user?.email);
      return false;
    }

    console.log('[adminAuth] verifyAdmin - user authenticated:', user.email);

    // Super admin sempre é autorizado
    if (user.email === 'a2soluntions@gmail.com' || user.email === 'araujoexcel@gmail.com') {
      console.log('[adminAuth] verifyAdmin - authorized super_admin by email');
      return true;
    }

    // Verificar role e lista de sub_admins
    const adminClient = getAdminSupabase();
    const queryClient = adminClient || client; // se não tem service role, usa anon

    const { data: profile } = await queryClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    console.log('[adminAuth] verifyAdmin - user role in DB:', profile?.role);

    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      console.log('[adminAuth] verifyAdmin - authorized by DB role');
      return true;
    }

    // Verificar na tabela saas_settings se está na lista de sub_admins
    const { data: settings } = await queryClient
      .from('saas_settings')
      .select('value')
      .eq('key', 'sub_admins')
      .maybeSingle();

    const subAdmins = settings?.value || [];
    console.log('[adminAuth] verifyAdmin - subAdmins settings:', subAdmins);
    if (Array.isArray(subAdmins) && subAdmins.includes(user.email)) {
      console.log('[adminAuth] verifyAdmin - authorized by sub_admins list');
      return true;
    }

    console.log('[adminAuth] verifyAdmin - user not authorized');
    return false;
  } catch (e) {
    console.error('[Admin Auth Helper] Erro:', e);
    return false;
  }
}
