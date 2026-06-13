import { NextResponse } from 'next/server';
import { createPreference } from '@/lib/mercadopago';
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

const PLANS = {
  vip: { name: 'VIP', price: 9.90 }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { planKey, couponCode, email, name, userId } = body;

    if (!planKey || !email || !userId) {
      return NextResponse.json({ error: 'Dados incompletos: planKey, email e userId são obrigatórios.' }, { status: 400 });
    }

    const plan = PLANS[planKey];
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    let finalPrice = plan.price;

    // Se houver cupom, validar e aplicar
    if (couponCode) {
      const supabase = getAdminSupabase();
      if (supabase) {
        const { data: coupon, error } = await supabase
          .from('saas_coupons')
          .select('*')
          .eq('code', couponCode.trim().toUpperCase())
          .maybeSingle();

        if (!error && coupon) {
          const discountVal = (finalPrice * coupon.discount) / 100;
          finalPrice = Math.max(0, finalPrice - discountVal);
        }
      }
    }

    if (finalPrice <= 0) {
      return NextResponse.json({ error: 'Pagamento de valor R$ 0.00 não pode ser processado via Mercado Pago. Use o fluxo de cupom gratuito.' }, { status: 400 });
    }

    // Obter origem dinâmica para back_urls
    let origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // O Mercado Pago exige estritamente HTTPS nas back_urls.
    // Se estivermos em localhost (HTTP), forçamos para HTTPS para passar na validação.
    if (origin.startsWith('http://')) {
      origin = origin.replace('http://', 'https://');
    }

    const externalReference = `${userId}:${planKey}:${couponCode || ''}`;
    const preference = await createPreference({
      items: [
        {
          title: `Assinatura ${plan.name} - Sports EV Tracker`,
          quantity: 1,
          unit_price: finalPrice,
          currency_id: 'BRL'
        }
      ],
      payer: {
        email,
        name
      },
      back_urls: {
        success: `${origin}/pricing?status=success`,
        failure: `${origin}/pricing?status=failure`,
        pending: `${origin}/pricing?status=pending`
      },
      external_reference: externalReference
    });

    return NextResponse.json({
      init_point: preference.init_point
    });

  } catch (err) {
    console.error('[Preference API Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao criar preferência.' }, { status: 500 });
  }
}
