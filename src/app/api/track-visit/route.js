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

export async function POST() {
  try {
    const client = getAdminSupabase();
    if (!client) {
      return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }

    // 1. Obter valor atual do visitors_count
    const { data: setting, error: fetchError } = await client
      .from('saas_settings')
      .select('value')
      .eq('key', 'visitors_count')
      .maybeSingle();

    if (fetchError) {
      console.error('[Track Visit] Error fetching count:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentCount = setting?.value !== undefined ? parseInt(setting.value) : 0;
    const newCount = currentCount + 1;

    // 2. Incrementar e salvar
    const { error: updateError } = await client
      .from('saas_settings')
      .upsert({ 
        key: 'visitors_count', 
        value: newCount,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('[Track Visit] Error updating count:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: newCount });
  } catch (err) {
    console.error('[Track Visit] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
