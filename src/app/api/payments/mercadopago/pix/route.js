import { NextResponse } from 'next/server';
import { createPixPayment } from '@/lib/mercadopago';
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
  pro: { name: 'PRO', price: 19.90 },
  vip: { name: 'VIP Elite', price: 49.90 }
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

    // Criar o pagamento no Mercado Pago
    const externalReference = `${userId}:${planKey}:${couponCode || ''}`;
    const payment = await createPixPayment({
      transaction_amount: finalPrice,
      description: `Assinatura ${plan.name} - Sports EV Tracker`,
      payer: {
        email,
        first_name: name ? name.split(' ')[0] : 'Cliente',
        last_name: name ? name.split(' ').slice(1).join(' ') || 'EV Tracker' : 'EV Tracker'
      },
      external_reference: externalReference
    });

    const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
    const paymentId = payment.id;

    if (!qrCode || !qrCodeBase64) {
      console.error('[Pix API] Erro ao obter dados do Pix do Mercado Pago:', payment);
      return NextResponse.json({ error: 'Mercado Pago não retornou os dados do Pix.' }, { status: 500 });
    }

    return NextResponse.json({
      paymentId,
      qrCode,
      qrCodeBase64,
      finalPrice
    });

  } catch (err) {
    console.error('[Pix API Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao processar Pix.' }, { status: 500 });
  }
}
