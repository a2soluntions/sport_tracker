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

    // 3. Get Current Time in America/Sao_Paulo (timezone of Brasilia) - ROBUST IMPLEMENTATION
    const now = new Date();
    const brtTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // UTC-3
    const currentHour = brtTime.getUTCHours();
    const currentMinute = brtTime.getUTCMinutes();
    const year = brtTime.getUTCFullYear();
    const month = String(brtTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(brtTime.getUTCDate()).padStart(2, '0');
    
    const todayDateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    console.log(`[Auto-Dispatch] Current Brasília time: ${timeStr} | Today: ${todayDateStr}`);

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
          // CONCURRENCY CONTROL: Write locks immediately before fetching to block other parallel runs
          if (!lastRuns.palpites[todayDateStr]) {
            lastRuns.palpites[todayDateStr] = [];
          }
          lastRuns.palpites[todayDateStr].push(scheduledHour);

          await client.from('saas_settings').upsert({
            key: 'telegram_last_dispatches',
            value: lastRuns,
            updated_at: new Date().toISOString()
          });

          console.log(`[Auto-Dispatch] Concurrency lock acquired. Triggering Palpites for hour: ${scheduledHour} with leagues:`, schedLeagues);

          // Fetch fixtures for today
          const origin = request.nextUrl.origin;
          const fixturesUrl = `${origin}/api/football/fixtures?league=all&date=${todayDateStr}&all=true`;
          
          try {
            const resFixtures = await fetch(fixturesUrl);
            const fixturesData = await resFixtures.json();
            const allFixtures = fixturesData.fixtures || [];

            // Filter fixtures by selected leagues and today's dayCategory, only before the match starts
            const todayGames = allFixtures.filter(g => {
              if (g.dayCategory !== 'HOJE') return false;
              if (!schedLeagues.includes(String(g.sourceLeagueId || ''))) return false;
              if (g.isFinished || g.isLive) return false;

              try {
                if (g.date && g.date.includes(' • ')) {
                  const parts = g.date.split(' • ');
                  const timePart = parts[parts.length - 1]; // "HH:MM"
                  if (timePart && timePart.includes(':')) {
                    const [h, m] = timePart.trim().split(':').map(Number);
                    if (isNaN(h) || isNaN(m)) return false;

                    const [yStr, moStr, dStr] = g.rawDate.split('-');
                    const matchTime = new Date(Date.UTC(Number(yStr), Number(moStr) - 1, Number(dStr), h + 3, m, 0)); // BRT (UTC-3) to UTC

                    const nowUTC = new Date();
                    if (isNaN(matchTime.getTime()) || matchTime.getTime() <= nowUTC.getTime()) {
                      // Match has already started, finished, or is invalid
                      return false;
                    }
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              } catch (err) {
                console.warn('[Auto-Dispatch] Error checking match time:', err);
                return false; // Discard on error to be safe
              }

              return true;
            });

            checkedPalpitesCount += todayGames.length;

            if (todayGames.length > 0) {
              const botToken = process.env.TELEGRAM_BOT_TOKEN;
              const chatId = process.env.TELEGRAM_VIP_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
              const palpitesTemplate = settings.telegram_palpites_template;
              const palpitesImage = settings.telegram_palpites_image_url;

              if (botToken && chatId) {
                for (const game of todayGames) {
                  // calculate Poisson
                  const stats = calculatePoissonMatchStats(game.homeXG, game.awayXG);
                  const bestTip = stats.bestTip;

                  // Safety check: ensure stats are correct and probability is realistic
                  if (bestTip && bestTip.selection && !isNaN(bestTip.prob) && bestTip.prob > 0 && bestTip.prob < 0.999) {
                    const probPct = (bestTip.prob * 100).toFixed(1);
                    const fairOdd = (1 / bestTip.prob).toFixed(2);

                    const templateStr = palpitesTemplate || `🏆 *NOVO PALPITE VIP* 🏆\n\n⚽ *Jogo:* {jogo}\n🎯 *Palpite:* {palpite}\n📊 *Probabilidade:* {probabilidade}%\n🔥 *Odd Justa:* @{odd_justa}\n\n_Palpite gerado pelo Algoritmo de Poisson_ 🤖`;

                    const message = templateStr
                      .replace(/{jogo}/g, `${game.home} x ${game.away}`)
                      .replace(/{palpite}/g, String(bestTip.selection))
                      .replace(/{probabilidade}/g, String(probPct))
                      .replace(/{odd_justa}/g, String(fairOdd));

                    // Send to Telegram (handling optional image using sendPhoto)
                    let telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                    let body = {
                      chat_id: chatId,
                      text: message,
                      parse_mode: 'Markdown'
                    };

                    if (palpitesImage) {
                      telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
                      body = {
                        chat_id: chatId,
                        photo: palpitesImage,
                        caption: message,
                        parse_mode: 'Markdown'
                      };
                    }

                    await fetch(telegramUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body)
                    });

                    // Pause to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
                dispatchedPalpites = true;
              }
            }

          } catch (err) {
            console.error('[Auto-Dispatch] Error fetching/sending palpites:', err);
          }
        }
      }
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
