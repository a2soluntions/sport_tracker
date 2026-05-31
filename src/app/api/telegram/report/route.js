import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { totalBets, totalInvested, netProfit, hitRate, roi, greens, reds, pending } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing Telegram credentials in .env.local');
      return NextResponse.json({ error: 'Configuração do Telegram ausente no servidor' }, { status: 500 });
    }

    const profitSign = netProfit >= 0 ? '+' : '';
    const emojiHeader = netProfit >= 0 ? '📈' : '📉';

    const message = `
${emojiHeader} *RELATÓRIO DE DESEMPENHO* ${emojiHeader}

💰 *Resultado Líquido:* ${profitSign}R$ ${netProfit.toFixed(2)} (${roi.toFixed(1)}% ROI)
📊 *Volume Total Apostado:* R$ ${totalInvested.toFixed(2)}
🎯 *Taxa de Acerto:* ${hitRate.toFixed(1)}%
🔢 *Total de Entradas:* ${totalBets}

🟢 *Greens:* ${greens}
🔴 *Reds:* ${reds}
⏳ *Pendentes:* ${pending}

_Gerado automaticamente pelo OddsSentry PRO_ 🤖
`;

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API Error:', data);
      return NextResponse.json({ error: data.description }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: data.result.message_id }, { status: 200 });
    
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ error: 'Falha interna no servidor' }, { status: 500 });
  }
}
