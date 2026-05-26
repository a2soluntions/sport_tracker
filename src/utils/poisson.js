// Função utilitária para fatorial
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Distribuição de Poisson
function poisson(lambda, k) {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

// Calcula todas as probabilidades de um jogo com base no xG e dados ao vivo se aplicável
export function calculatePoissonMatchStats(homeXG, awayXG, isLive = false, minute = 0, goalsHome = 0, goalsAway = 0) {
  let effectiveHomeXG = homeXG;
  let effectiveAwayXG = awayXG;
  
  if (isLive) {
    const timeRemaining = Math.max(0, 90 - minute);
    const timeFactor = timeRemaining / 90.0;
    effectiveHomeXG = Math.max(0.001, homeXG * timeFactor);
    effectiveAwayXG = Math.max(0.001, awayXG * timeFactor);
  }

  const maxGoalsRemaining = 10;
  const scoreMatrix = Array(maxGoalsRemaining).fill(0).map(() => Array(maxGoalsRemaining).fill(0));
  let probHome = 0;
  let probDraw = 0;
  let probAway = 0;
  
  let probOver15 = 0;
  let probOver25 = 0;
  let probOver35 = 0;
  let probBtts = 0;

  for (let h = 0; h < maxGoalsRemaining; h++) {
    for (let a = 0; a < maxGoalsRemaining; a++) {
      const prob = poisson(effectiveHomeXG, h) * poisson(effectiveAwayXG, a);
      scoreMatrix[h][a] = prob;

      const finalHomeGoals = goalsHome + h;
      const finalAwayGoals = goalsAway + a;

      // 1X2
      if (finalHomeGoals > finalAwayGoals) probHome += prob;
      else if (finalHomeGoals === finalAwayGoals) probDraw += prob;
      else probAway += prob;

      // Over Goals
      const totalGoals = finalHomeGoals + finalAwayGoals;
      if (totalGoals > 1) probOver15 += prob;
      if (totalGoals > 2) probOver25 += prob;
      if (totalGoals > 3) probOver35 += prob;

      // BTTS (Ambas Marcam)
      if (finalHomeGoals > 0 && finalAwayGoals > 0) probBtts += prob;
    }
  }

  // Normalização
  const total1X2 = probHome + probDraw + probAway || 1;
  probHome = probHome / total1X2;
  probDraw = probDraw / total1X2;
  probAway = probAway / total1X2;

  // Identifica o melhor palpite para o jogo (simulando um modelo preditivo +EV)
  let bestTip = { market: '', selection: '', prob: 0, odd: 0 };
  
  if (probHome > 0.45) bestTip = { market: '1X2', selection: 'Casa Vence', prob: probHome, odd: 1/probHome };
  else if (probAway > 0.40) bestTip = { market: '1X2', selection: 'Fora Vence', prob: probAway, odd: 1/probAway };
  else if (probOver25 > 0.50) bestTip = { market: 'Gols', selection: 'Mais de 2.5 Gols', prob: probOver25, odd: 1/probOver25 };
  else if (probBtts > 0.55) bestTip = { market: 'Ambas Marcam', selection: 'Sim', prob: probBtts, odd: 1/probBtts };
  else bestTip = { market: '1X2', selection: 'Empate', prob: probDraw, odd: 1/probDraw };

  return {
    scoreMatrix,
    probHome,
    probDraw,
    probAway,
    probOver15,
    probOver25,
    probOver35,
    probBtts,
    bestTip
  };
}

export function formatPct(prob) {
  return (prob * 100).toFixed(1);
}

export function formatOdd(prob) {
  if (prob === 0) return "0.00";
  return (1 / prob).toFixed(2);
}
