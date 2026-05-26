import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { round, bets, stats } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing Telegram credentials in .env.local');
      return NextResponse.json({ error: 'Configuração do Telegram ausente no servidor' }, { status: 500 });
    }

    // Separar as apostas em Greens, Reds e Pendentes
    const greensList = [];
    const redsList = [];
    const pendingList = [];

    bets.forEach(b => {
      const line = `• *${b.home} x ${b.away}* (${b.selection}) \\- ODD @${b.odd.toFixed(2)} (Stake R$ ${b.amount.toFixed(2)})`;
      if (b.type === 'ganho') {
        const profit = b.amount * (b.odd - 1);
        greensList.push(`${line} ➔ *\\+R$ ${profit.toFixed(2)}*`);
      } else if (b.type === 'perda') {
        redsList.push(`${line} ➔ *\\-R$ ${b.amount.toFixed(2)}*`);
      } else {
        pendingList.push(line);
      }
    });

    // Montar a mensagem em MarkdownV2 (escapando caracteres especiais obrigatórios no Telegram)
    const escapeMarkdown = (text) => {
      if (!text) return '';
      return text.toString().replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
    };

    const profitSign = stats.netProfit >= 0 ? '\\+' : '';
    const emojiHeader = stats.netProfit >= 0 ? '📈' : '📉';

    let message = `🏁 *BALANÇO DA RODADA ${round}* 🏁\n\n`;
    message += `Aqui está o resumo das entradas seguidas na rodada ${round} do Brasileirão:\n\n`;

    if (greensList.length > 0) {
      message += `🟢 *ACERTOS (GREENS):*\n${greensList.join('\n')}\n\n`;
    }

    if (redsList.length > 0) {
      message += `🔴 *ERROS (REDS):*\n${redsList.join('\n')}\n\n`;
    }

    if (pendingList.length > 0) {
      message += `⏳ *EM ABERTO / PENDENTES:*\n${pendingList.join('\n')}\n\n`;
    }

    message += `📊 *RESULTADO CONSOLIDADO:*\n`;
    message += `💰 *Resultado Líquido:* *${profitSign}R$ ${stats.netProfit.toFixed(2)}* (${stats.roi.toFixed(1)}% ROI)\n`;
    message += `💸 *Total Investido:* R$ ${stats.totalInvested.toFixed(2)}\n`;
    message += `🎯 *Taxa de Acerto:* ${stats.hitRate.toFixed(1)}%\n`;
    message += `🔢 *Entradas:* ${stats.greens}G / ${stats.reds}R / ${stats.pending}P\n\n`;
    message += `_Gerado automaticamente pelo Sports EV Tracker_ 🤖`;

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2'
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
