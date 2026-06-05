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

// GET /api/admin/features — Retorna módulos futuros
export async function GET(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data: features, error } = await client
      .from('saas_features')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[Features API] Erro ao buscar módulos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ features: features || [] });
  } catch (err) {
    console.error('[Features API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/admin/features — Adiciona módulo futuro
export async function POST(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, active } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data: newFeature, error } = await client
      .from('saas_features')
      .insert({ 
        name: name.trim(), 
        description: description || '', 
        active: active !== undefined ? active : true 
      })
      .select()
      .single();

    if (error) {
      console.error('[Features API] Erro ao criar módulo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feature: newFeature });
  } catch (err) {
    console.error('[Features API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/admin/features — Atualiza status (active) do módulo
export async function PATCH(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, active } = body;

    if (!id || active === undefined) {
      return NextResponse.json({ error: 'ID e status de ativação obrigatórios' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data: updatedFeature, error } = await client
      .from('saas_features')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Features API] Erro ao atualizar módulo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feature: updatedFeature });
  } catch (err) {
    console.error('[Features API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/admin/features — Remove módulo
export async function DELETE(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { error } = await client
      .from('saas_features')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Features API] Erro ao deletar módulo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Features API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
