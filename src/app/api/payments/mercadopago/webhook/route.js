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

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Tentar ler do body
    let body = {};
    try {
      body = await request.json();
    } catch (e) {}
    
    console.log('[Webhook Received]:', { body, query: Object.fromEntries(searchParams.entries()) });

    // Encontrar o ID do pagamento nas diferentes estruturas do Mercado Pago
    const paymentId = body.data?.id || body.id || searchParams.get('data.id') || searchParams.get('id');
    const type = body.type || searchParams.get('type') || 'payment';

    if (type !== 'payment') {
      // Ignorar outros eventos como merchant_order, subscription, etc.
      return NextResponse.json({ received: true });
    }

    if (!paymentId) {
      return NextResponse.json({ error: 'ID do pagamento não fornecido.' }, { status: 400 });
    }

    // Buscar o pagamento no Mercado Pago
    const payment = await getPayment(paymentId);
    
    if (payment.status === 'approved') {
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
            console.error('[Webhook] Erro ao atualizar perfil no Supabase:', error);
            return NextResponse.json({ error: 'Erro ao salvar no banco.' }, { status: 500 });
          } else {
            console.log(`[Webhook] Sucesso: Plano ${planKey} ativado para o usuário ${userId}`);
          }
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('[Webhook Error]:', err);
    // Retornar 200/ok mesmo com erro interno para que o Mercado Pago não fique reenviando
    return NextResponse.json({ received: true, error: err.message });
  }
}
