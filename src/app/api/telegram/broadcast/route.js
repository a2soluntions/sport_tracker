import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { match, tip, probability, odd } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing Telegram credentials in .env.local');
      return NextResponse.json({ error: 'Configuração do Telegram ausente no servidor' }, { status: 500 });
    }

    // Formatando a mensagem com MarkdownV2 do Telegram
    const message = `
🏆 *NOVO PALPITE VIP* 🏆

⚽ *Jogo:* ${match}
🎯 *Palpite:* ${tip}
📊 *Probabilidade:* ${probability}%
🔥 *Odd Justa:* @${odd}

_Palpite gerado pelo Algoritmo de Poisson_ 🤖
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
