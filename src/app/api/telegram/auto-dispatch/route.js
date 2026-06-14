import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoissonMatchStats } from '@/utils/poisson';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Helper: check if a time is within a 10 minutes window after the scheduled time
function isTimeActive(scheduledStr, currentHour, currentMinute) {
  try {
    const [schH, schM] = scheduledStr.split(':').map(Number);
    const scheduledMinutes = schH * 60 + schM;
    const currentMinutes = currentHour * 60 + currentMinute;
    const diff = currentMinutes - scheduledMinutes;
    return diff >= 0 && diff <= 10;
  } catch (err) {
    return false;
  }
}

async function handleDispatch(request) {
  try {
    // 1. Verify Authorization (Bearer process.env.SUPABASE_SERVICE_ROLE_KEY) or x-vercel-cron header
    const authHeader = request.headers.get('authorization');
    const isCron = request.headers.get('x-vercel-cron') === 'true';

    if (authHeader !== `Bearer ${supabaseServiceKey}` && !isCron) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const client = getAdminSupabase();
    if (!client) {
      return NextResponse.json({ error: 'Erro de Configuração do Supabase' }, { status: 500 });
    }

    // 2. Fetch saas_settings
    const { data: settingsList, error: settingsError } = await client
      .from('saas_settings')
      .select('*');

    if (settingsError) {
      return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
    }

    const settings = {};
    (settingsList || []).forEach(item => {
      settings[item.key] = item.value;
    });

    // 3. Get Current Time in America/Sao_Paulo (timezone of Brasilia)
    const now = new Date();
    
    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const dateStrFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const timeStr = timeFormatter.format(now);
    const [currentHour, currentMinute] = timeStr.split(':').map(Number);

    const dParts = dateStrFormatter.formatToParts(now);
    const year = dParts.find(p => p.type === 'year').value;
    const month = dParts.find(p => p.type === 'month').value;
    const day = dParts.find(p => p.type === 'day').value;
    const todayDateStr = `${year}-${month}-${day}`;

    console.log(`[Auto-Dispatch] Current time: ${timeStr} | Today: ${todayDateStr}`);

    const lastRuns = settings.telegram_last_dispatches || { alerta_ev: {}, palpites: {} };
    if (!lastRuns.alerta_ev) lastRuns.alerta_ev = {};
    if (!lastRuns.palpites) lastRuns.palpites = {};

    let dispatchedPalpites = false;
    let checkedPalpitesCount = 0;

    // 4. Handle Palpites automatic dispatch
    const palpitesEnabled = settings.telegram_palpites_enabled === true;
    const palpitesSchedules = settings.telegram_palpites_schedules || [];

    if (palpitesEnabled && palpitesSchedules.length > 0) {
      for (const sched of palpitesSchedules) {
        const scheduledHour = sched.hour;
        const schedLeagues = (sched.leagues || []).map(String);
        
        if (schedLeagues.length === 0) continue;

        const isActive = isTimeActive(scheduledHour, currentHour, currentMinute);
        const alreadyRunToday = (lastRuns.palpites[todayDateStr] || []).includes(scheduledHour);

        if (isActive && !alreadyRunToday) {
          console.log(`[Auto-Dispatch] Triggering Palpites for hour: ${scheduledHour} with leagues:`, schedLeagues);

          // Fetch fixtures for today
          const origin = request.nextUrl.origin;
          const fixturesUrl = `${origin}/api/football/fixtures?league=all&date=${todayDateStr}&all=true`;
          
          try {
            const resFixtures = await fetch(fixturesUrl);
            const fixturesData = await resFixtures.json();
            const allFixtures = fixturesData.fixtures || [];

            // Filter fixtures by selected leagues and today's dayCategory
            const todayGames = allFixtures.filter(g => 
              g.dayCategory === 'HOJE' && 
              schedLeagues.includes(String(g.sourceLeagueId || ''))
            );

            checkedPalpitesCount += todayGames.length;

            if (todayGames.length > 0) {
              const botToken = process.env.TELEGRAM_BOT_TOKEN;
              const chatId = process.env.TELEGRAM_VIP_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

              if (botToken && chatId) {
                for (const game of todayGames) {
                  // calculate Poisson
                  const stats = calculatePoissonMatchStats(game.homeXG, game.awayXG);
                  const bestTip = stats.bestTip;

                  if (bestTip && bestTip.selection) {
                    const probPct = (bestTip.prob * 100).toFixed(1);
                    const fairOdd = (1 / bestTip.prob).toFixed(2);

                    const message = `🏆 *NOVO PALPITE VIP* 🏆\n\n⚽ *Jogo:* ${game.home} x ${game.away}\n🎯 *Palpite:* ${bestTip.selection}\n📊 *Probabilidade:* ${probPct}%\n🔥 *Odd Justa:* @${fairOdd}\n\n_Palpite gerado pelo Algoritmo de Poisson_ 🤖`;

                    // Send to Telegram
                    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                    await fetch(telegramUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'Markdown'
                      })
                    });

                    // Pause to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
                dispatchedPalpites = true;
              }
            }

            // Mark this hour as completed for today
            if (!lastRuns.palpites[todayDateStr]) {
              lastRuns.palpites[todayDateStr] = [];
            }
            lastRuns.palpites[todayDateStr].push(scheduledHour);

          } catch (err) {
            console.error('[Auto-Dispatch] Error fetching/sending palpites:', err);
          }
        }
      }
    }

    // Save updated lastRuns state back to database
    if (dispatchedPalpites || checkedPalpitesCount > 0) {
      await client.from('saas_settings').upsert({
        key: 'telegram_last_dispatches',
        value: lastRuns,
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      time: timeStr,
      palpites: {
        enabled: palpitesEnabled,
        dispatched: dispatchedPalpites,
        gamesChecked: checkedPalpitesCount
      }
    });

  } catch (err) {
    console.error('[Auto-Dispatch] Error:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request) {
  return handleDispatch(request);
}

export async function POST(request) {
  return handleDispatch(request);
}
