import { NextResponse } from 'next/server';
import { getPayment } from '@/lib/mercadopago';
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      return NextResponse.json({ error: 'ID do pagamento é obrigatório.' }, { status: 400 });
    }

    const payment = await getPayment(paymentId);
    const status = payment.status;

    // Se o pagamento estiver aprovado, garantir que o plano está ativado no banco de dados
    if (status === 'approved') {
      const externalReference = payment.external_reference;
      if (externalReference && externalReference.includes(':')) {
        const [userId, planKey, couponCode] = externalReference.split(':');
        
        const supabase = getAdminSupabase();
        if (supabase && userId && planKey) {
          const { error } = await supabase
            .from('profiles')
            .update({
              plan: planKey,
              coupon_code: couponCode || null
            })
            .eq('id', userId);

          if (error) {
            console.error('[Status API] Erro ao atualizar perfil no Supabase:', error);
          } else {
            console.log(`[Status API] Sucesso: Plano ${planKey} ativado para o usuário ${userId}`);
          }
        }
      }
    }

    return NextResponse.json({ status });

  } catch (err) {
    console.error('[Status API Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao consultar status.' }, { status: 500 });
  }
}
