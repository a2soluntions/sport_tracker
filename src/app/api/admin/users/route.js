import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Criar cliente Supabase com service_role key (acesso total, server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// GET /api/admin/users — Lista todos os perfis
export async function GET(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const client = getAdminSupabase();
    if (!client) {
      return NextResponse.json({ error: 'Erro de Configuração: A variável SUPABASE_SERVICE_ROLE_KEY está ausente no servidor.' }, { status: 500 });
    }

    const { data: profiles, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin API] Erro ao buscar profiles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calcular métricas SaaS
    let proCount = 0;
    let vipCount = 0;
    let gratisCount = 0;
    let vitalicioCount = 0;

    (profiles || []).forEach(p => {
      switch (p.plan) {
        case 'pro': proCount++; break;
        case 'vip': vipCount++; break;
        case 'vitalicio': vitalicioCount++; break;
        default: gratisCount++;
      }
    });

    const mrr = (proCount * 19.90) + ((vipCount + vitalicioCount) * 49.90);

    return NextResponse.json({
      users: profiles || [],
      metrics: {
        totalUsers: (profiles || []).length,
        proCount,
        vipCount: vipCount + vitalicioCount,
        gratisCount,
        mrr
      }
    });
  } catch (err) {
    console.error('[Admin API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/admin/users — Atualizar plano/role de um usuário
export async function PATCH(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, plan, role } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
    }

    const client = getAdminSupabase();
    if (!client) {
      return NextResponse.json({ error: 'Erro de Configuração: A variável SUPABASE_SERVICE_ROLE_KEY está ausente no servidor.' }, { status: 500 });
    }

    const updateData = {};
    if (plan) updateData.plan = plan;
    if (role) updateData.role = role;
    if (body.coupon_code !== undefined) updateData.coupon_code = body.coupon_code;

    const { data, error } = await client
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Admin API] Erro ao atualizar perfil:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error('[Admin API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
