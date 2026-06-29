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
        query = query.or(`campeonato.ilike."[LIVE|%",created_at.gte.${twoHoursAgo}`);
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

    // Ordenamos sempre por created_at desc no banco para processar a versão mais recente primeiro na deduplicação
    query = query.order('created_at', { ascending: false }).limit(2000);

    const { data: rawOpportunities, error } = await query;

    if (error) {
      console.error('[Opportunities API] Erro ao buscar oportunidades:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplica por (confronto, mercado) mantendo apenas a oportunidade mais recente (que aparece primeiro devido ao order desc)
    const seen = new Set();
    let deduplicated = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    for (const opp of (rawOpportunities || [])) {
      const confrontoKey = (opp.confronto || '').trim().toLowerCase();
      const mercadoKey = (opp.mercado || '').trim().toLowerCase();
      const uniqueKey = `${confrontoKey}|${mercadoKey}`;

      if (!seen.has(uniqueKey)) {
        // Validação de datas para dispatch manual (apenas se resultado for pending)
        if (resultado === 'pending') {
          const campeonato = opp.campeonato || '';
          
          // Se for LIVE, sempre mantemos
          if (!campeonato.startsWith('[LIVE|')) {
            if (campeonato.startsWith('[')) {
              const closeBracketIdx = campeonato.indexOf(']');
              if (closeBracketIdx > 1) {
                const datePart = campeonato.substring(1, closeBracketIdx).trim();
                const dateMatch = datePart.match(/^(\d{2})\/(\d{2})/);
                if (dateMatch) {
                  const day = parseInt(dateMatch[1], 10);
                  const month = parseInt(dateMatch[2], 10);

                  const timeMatch = datePart.match(/\s+(\d{2}):(\d{2})$/);
                  let hour = 0;
                  let minute = 0;
                  if (timeMatch) {
                    hour = parseInt(timeMatch[1], 10);
                    minute = parseInt(timeMatch[2], 10);
                  }

                  // Cria a data e hora do jogo no fuso horário oficial de Brasília (UTC-3)
                  const matchDateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;
                  const matchDate = new Date(matchDateStr);
                  
                  if (!isNaN(matchDate.getTime())) {
                    // Se o horário de início for anterior a agora, descarta (já passou/começou)
                    if (matchDate < now) {
                      continue;
                    }

                    // Se for mais do que 2 dias no futuro, descarta
                    if (matchDate > twoDaysFromNow) {
                      continue;
                    }
                  }
                }
              }
            } else {
              // Sem prefixo de data explícito.
              // Se foi criado há mais de 24h, descarta.
              const createdAtTime = new Date(opp.created_at).getTime();
              const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
              if (createdAtTime < oneDayAgo) {
                continue;
              }
            }
          }
        }

        seen.add(uniqueKey);
        deduplicated.push(opp);
      }
    }

    // Ordenação inteligente
    const sortBy = searchParams.get('sortBy');
    if (sortBy === 'ev') {
      deduplicated.sort((a, b) => (b.vantagem_ev_porcentagem || 0) - (a.vantagem_ev_porcentagem || 0));
    } else {
      // Ordenação cronológica: LIVE primeiro, depois por horário de início da partida crescente (mais próximos do início primeiro)
      const getMatchSortScore = (opp) => {
        const campeonato = opp.campeonato || '';
        
        // Se for LIVE, prioridade máxima (sobe para o topo)
        if (campeonato.startsWith('[LIVE|')) {
          return 0;
        }
        
        if (campeonato.startsWith('[')) {
          const closeBracketIdx = campeonato.indexOf(']');
          if (closeBracketIdx > 1) {
            const datePart = campeonato.substring(1, closeBracketIdx).trim();
            const dateMatch = datePart.match(/^(\d{2})\/(\d{2})/);
            if (dateMatch) {
              const day = parseInt(dateMatch[1], 10);
              const month = parseInt(dateMatch[2], 10);
              
              const timeMatch = datePart.match(/\s+(\d{2}):(\d{2})$/);
              let hour = 0;
              let minute = 0;
              if (timeMatch) {
                hour = parseInt(timeMatch[1], 10);
                minute = parseInt(timeMatch[2], 10);
              }
              
              const matchDate = new Date(currentYear, month - 1, day, hour, minute);
              if (!isNaN(matchDate.getTime())) {
                return matchDate.getTime();
              }
            }
          }
        }
        
        // Sem data: joga para o final usando o timestamp de criação como fallback secundário
        return new Date(opp.created_at).getTime() + 1000 * 60 * 60 * 24 * 30;
      };

      deduplicated.sort((a, b) => getMatchSortScore(a) - getMatchSortScore(b));
    }

    const totalCount = deduplicated.length;
    const paginated = deduplicated.slice(offset, offset + limit);

    return NextResponse.json({ 
      opportunities: paginated,
      totalCount,
      page,
      limit
    });
  } catch (err) {
    console.error('[Opportunities API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
