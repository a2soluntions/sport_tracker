import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const SYSTEM_INSTRUCTION = `
Você é o assistente virtual de suporte do "Sports EV Tracker" (também conhecido como A2 Sport Trackers).
Seu objetivo é ajudar os usuários a tirarem dúvidas sobre a plataforma, conceitos de apostas, planos de assinatura e o canal VIP do Telegram.

INSTRUÇÕES DO SISTEMA:
1. O que é o Sports EV Tracker? É uma plataforma avançada de inteligência matemática que analisa partidas de futebol e identifica apostas com Valor Esperado Positivo (+EV). Monitoramos odds de casas de apostas (como Betano, Bet365, Betesporte) e comparamos com as probabilidades reais calculadas pelo nosso modelo de Poisson (Fair Lines).
2. O que é +EV (Expected Value Positivo)? Significa que a odd oferecida pela casa é maior do que a probabilidade real do evento acontecer. A longo prazo, apostar em eventos +EV garante lucro matemático constante.
3. Gestão de Banca: Recomendamos fortemente que os usuários utilizem stake de 1% a 2% da banca por oportunidade enviada, permitindo sobreviver a variações de curto prazo (bad runs).
4. Canal VIP do Telegram: O canal VIP recebe alertas automáticos de oportunidades +EV em tempo real, enviadas diretamente pelo nosso algoritmo. Os usuários podem assinar os planos VIP ou PRO para ter acesso.
5. Transbordo para Suporte Humano:
   - Se o usuário pedir para falar com um atendente humano, suporte físico, WhatsApp ou Telegram de suporte, ou se ele tiver algum problema com pagamento/cobrança que exige checagem manual, responda de forma solícita dizendo que vai fornecer o botão de contato para o atendente e, OBRIGATORIAMENTE, finalize sua mensagem incluindo a tag exatamente assim: [SUPPORT_REDIRECT]
   - Exemplo: "Com certeza, vou te passar para o nosso suporte humano para verificarmos sua assinatura. Clique no botão abaixo para iniciar o atendimento: [SUPPORT_REDIRECT]"

REGRAS DE TOM DE VOZ:
- Seja prestativo, profissional, direto e amigável.
- Use emojis moderadamente para tornar a conversa agradável.
- Escreva em português do Brasil (pt-BR).
`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Histórico de mensagens inválido' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.warn('[Support Chat API] GEMINI_API_KEY não configurada no servidor.');
      return NextResponse.json({ 
        response: 'Olá! Sou o assistente de suporte do Sports EV. No momento, minha conexão com a inteligência artificial está inativa. Se precisar de ajuda ou tiver problemas com pagamentos, clique no botão abaixo para falar com o nosso suporte humano! [SUPPORT_REDIRECT]'
      });
    }

    // Formatar histórico de mensagens para a estrutura de API do Gemini (user -> user, model -> model)
    const formattedContents = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: msg.text }]
      };
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: formattedContents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Support Chat API] Erro ao chamar API do Gemini:', errText);
      return NextResponse.json({ 
        response: 'Desculpe, tive um problema de comunicação interno. Você pode tentar falar com o suporte humano clicando abaixo: [SUPPORT_REDIRECT]' 
      });
    }

    const data = await res.json();
    const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ response: modelText });
  } catch (err) {
    console.error('[Support Chat API] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
