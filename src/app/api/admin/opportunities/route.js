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

// GET /api/admin/opportunities — Retorna as oportunidades detectadas com paginação
export async function GET(request) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const client = getAdminSupabase();
    if (!client) {
      return NextResponse.json({ error: 'Erro de Configuração: A variável SUPABASE_SERVICE_ROLE_KEY está ausente no servidor.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');
    const page = parseInt(searchParams.get('page') || '1');
    const resultado = searchParams.get('resultado');
    const dateFilter = searchParams.get('date'); // YYYY-MM-DD
    const leagueFilter = searchParams.get('league');

    const offset = (page - 1) * limit;

    let query = client
      .from('ev_opportunities')
      .select('*', { count: 'exact' });

    if (resultado) {
      query = query.eq('resultado', resultado);
      if (resultado === 'pending' && !dateFilter) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        query = query.or(`campeonato.ilike.[LIVE|%,created_at.gte.${twoHoursAgo}`);
      }
    }

    if (dateFilter) {
      // Filtrar oportunidades criadas naquele dia (fuso horário local Brasil)
      query = query.gte('created_at', `${dateFilter}T00:00:00-03:00`)
                   .lte('created_at', `${dateFilter}T23:59:59-03:00`);
    }

    if (leagueFilter && leagueFilter !== 'all') {
      query = query.ilike('campeonato', `%${leagueFilter}%`);
    }

    const sortBy = searchParams.get('sortBy');
    console.log("[GET /api/admin/opportunities] sortBy recebido no backend:", sortBy);

    if (sortBy === 'ev') {
      query = query.order('vantagem_ev_porcentagem', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: opportunities, count, error } = await query;

    if (error) {
      console.error('[Opportunities API] Erro ao buscar oportunidades:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      opportunities,
      totalCount: count || 0,
      page,
      limit
    });
  } catch (err) {
    console.error('[Opportunities API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
