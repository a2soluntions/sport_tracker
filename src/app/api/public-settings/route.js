import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET() {
  try {
    const client = getAdminSupabase();
    if (!client) {
      return NextResponse.json({ error: 'Erro de Configuração' }, { status: 500 });
    }

    const { data: item, error } = await client
      .from('saas_settings')
      .select('*')
      .eq('key', 'a2score_ads')
      .maybeSingle();

    if (error) {
      console.error('[Public Settings API] Erro ao buscar anúncios:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Default ads if not set in DB
    const defaultAds = {
      left: {
        title: "A2 VIP Group",
        description: "Acesso aos melhores sinais com ROI garantido.",
        emoji: "🎯",
        link: "https://t.me/",
        buttonText: "Participar VIP",
        enabled: true
      },
      right: {
        title: "Poisson Pro",
        description: "Libere análises táticas completas sem limites.",
        emoji: "⚡",
        link: "/pricing",
        buttonText: "Assinar Agora",
        enabled: true
      }
    };

    const ads = item && item.value ? item.value : defaultAds;

    return NextResponse.json({ ads });
  } catch (err) {
    console.error('[Public Settings API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
