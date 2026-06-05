import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function getSupabaseClient() {
  const adminClient = getAdminSupabase();
  if (adminClient) return adminClient;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (supabaseUrl && anonKey) {
    return createClient(supabaseUrl, anonKey);
  }
  return null;
}

// GET /api/admin/settings — Retorna todas as configurações da tabela saas_settings
export async function GET(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data: settingsList, error } = await client
      .from('saas_settings')
      .select('*');

    if (error) {
      console.error('[Settings API] Erro ao buscar configurações:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Converter lista de {key, value} para um objeto chave-valor unificado
    const settings = {};
    (settingsList || []).forEach(item => {
      settings[item.key] = item.value;
    });

    // Se alguma das configurações principais estiver faltando, providenciar defaults
    if (!settings.sub_admins) {
      settings.sub_admins = ['admin.suporte@gmail.com', 'parceiro.a2@gmail.com'];
    }
    if (!settings.expense_categories) {
      settings.expense_categories = ['Servidor', 'Database', 'API', 'Marketing', 'Outros'];
    }
    if (settings.visitors_count === undefined) {
      settings.visitors_count = 10200;
    }
    if (settings.trial_count === undefined) {
      settings.trial_count = 2450;
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[Settings API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/admin/settings — Atualiza uma configuração específica
export async function PATCH(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Chave e valor obrigatórios' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data, error } = await client
      .from('saas_settings')
      .upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString() 
      })
      .select()
      .single();

    if (error) {
      console.error(`[Settings API] Erro ao atualizar configuração ${key}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ setting: data });
  } catch (err) {
    console.error('[Settings API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
