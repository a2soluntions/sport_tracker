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
          let profileData = {
            id: userId,
            plan: planKey,
            coupon_code: couponCode || null,
            updated_at: new Date().toISOString()
          };

          const isTelegramUser = userId.startsWith('tg_');
          if (isTelegramUser) {
            profileData.email = `${userId}@oddsentry.com`;
            profileData.name = 'Cliente Telegram';
            profileData.role = 'user';
          }

          const { error } = await supabase
            .from('profiles')
            .upsert(profileData);

          if (error) {
            console.error('[Webhook] Erro ao atualizar/upsert perfil no Supabase:', error);
            return NextResponse.json({ error: 'Erro ao salvar no banco.' }, { status: 500 });
          } else {
            console.log(`[Webhook] Sucesso: Plano ${planKey} ativado para o usuário ${userId}`);
            
            // Se for usuário Telegram, criar suas configurações locais de notificação
            if (isTelegramUser) {
              const tgChatId = userId.replace('tg_', '');
              await supabase
                .from('user_settings')
                .upsert({
                  id: userId,
                  telegram_chat_id: tgChatId,
                  receive_telegram: true,
                  banca: 1000,
                  min_ev: 5,
                  alert_prematch: true,
                  alert_live: true,
                  updated_at: new Date().toISOString()
                });

              // Gerar link de convite para o grupo VIP do Telegram
              const botToken = process.env.TELEGRAM_BOT_TOKEN;
              const vipGroupId = process.env.TELEGRAM_VIP_CHAT_ID;
              
              if (botToken && vipGroupId) {
                try {
                  const expireDate = Math.floor(Date.now() / 1000) + 86400; // 24 horas
                  const inviteRes = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: vipGroupId,
                      member_limit: 1,
                      expire_date: expireDate
                    })
                  });
                  const inviteData = await inviteRes.json();
                  
                  if (inviteData.ok && inviteData.result?.invite_link) {
                    const inviteLink = inviteData.result.invite_link;
                    const message = `🏆 *PAGAMENTO APROVADO!* 🏆\n\nSeu plano *${planKey.toUpperCase()}* foi ativado com sucesso.\n\nAqui está o seu link de convite exclusivo para entrar no nosso Grupo VIP de Sinais:\n👉 [ENTRAR NO GRUPO VIP](${inviteLink})\n\n*(Este link expira em 24h e é válido para apenas uma entrada)*`;
                    
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: tgChatId,
                        text: message,
                        parse_mode: 'Markdown'
                      })
                    });
                  } else {
                    console.error('[Webhook Telegram] Erro ao criar link de convite:', inviteData);
                  }
                } catch (tgErr) {
                  console.error('[Webhook Telegram] Falha ao enviar convite VIP:', tgErr);
                }
              }
            }
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
