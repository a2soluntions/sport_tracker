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

// GET /api/admin/expenses — Retorna despesas e categorias
export async function GET(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data: expenses, error: expError } = await client
      .from('saas_expenses')
      .select('*')
      .order('id', { ascending: true });

    if (expError) {
      console.error('[Expenses API] Erro ao buscar despesas:', expError);
      return NextResponse.json({ error: expError.message }, { status: 500 });
    }

    return NextResponse.json({ expenses: expenses || [] });
  } catch (err) {
    console.error('[Expenses API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/admin/expenses — Adiciona despesa
export async function POST(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, value, category } = body;

    if (!name || value === undefined || !category) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const { data: newExpense, error } = await client
      .from('saas_expenses')
      .insert({ name, value: parseFloat(value), category })
      .select()
      .single();

    if (error) {
      console.error('[Expenses API] Erro ao criar despesa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: newExpense });
  } catch (err) {
    console.error('[Expenses API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/admin/expenses — Atualiza despesa
export async function PATCH(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, value, category } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (category) updateData.category = category;

    const { data: updatedExpense, error } = await client
      .from('saas_expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Expenses API] Erro ao atualizar despesa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: updatedExpense });
  } catch (err) {
    console.error('[Expenses API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/admin/expenses — Remove despesa
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
      .from('saas_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Expenses API] Erro ao deletar despesa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Expenses API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
