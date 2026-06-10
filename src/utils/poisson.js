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
  
  let probOver05 = 0;
  let probOver15 = 0;
  let probOver25 = 0;
  let probOver35 = 0;
  let probBtts = 0;

  // Variáveis para Handicap Asiático
  let probAH00_home_num = 0;
  let probAH00_home_den = 0;

  let probAH10_home_num = 0;
  let probAH10_home_den = 0;
  let probAH10_away_num = 0;
  let probAH10_away_den = 0;

  let probAH15_home = 0;
  let probAH15_away = 0;

  let probAH10Pos_home_num = 0;
  let probAH10Pos_home_den = 0;
  let probAH10Pos_away_num = 0;
  let probAH10Pos_away_den = 0;

  let probAH15Pos_home = 0;
  let probAH15Pos_away = 0;

  for (let h = 0; h < maxGoalsRemaining; h++) {
    for (let a = 0; a < maxGoalsRemaining; a++) {
      const prob = poisson(effectiveHomeXG, h) * poisson(effectiveAwayXG, a);
      scoreMatrix[h][a] = prob;

      const finalHomeGoals = goalsHome + h;
      const finalAwayGoals = goalsAway + a;
      const diff = finalHomeGoals - finalAwayGoals;

      // 1X2
      if (diff > 0) probHome += prob;
      else if (diff === 0) probDraw += prob;
      else probAway += prob;

      // Over Goals
      const totalGoals = finalHomeGoals + finalAwayGoals;
      if (totalGoals > 0) probOver05 += prob;
      if (totalGoals > 1) probOver15 += prob;
      if (totalGoals > 2) probOver25 += prob;
      if (totalGoals > 3) probOver35 += prob;

      // BTTS (Ambas Marcam)
      if (finalHomeGoals > 0 && finalAwayGoals > 0) probBtts += prob;

      // Handicap 0.0 (DNB)
      if (diff > 0) {
        probAH00_home_num += prob;
        probAH00_home_den += prob;
      } else if (diff < 0) {
        probAH00_home_den += prob;
      }

      // Handicap -1.0
      if (diff >= 2) {
        probAH10_home_num += prob;
        probAH10_home_den += prob;
      } else if (diff <= 0) {
        probAH10_home_den += prob;
      }

      if (-diff >= 2) {
        probAH10_away_num += prob;
        probAH10_away_den += prob;
      } else if (-diff <= 0) {
        probAH10_away_den += prob;
      }

      // Handicap -1.5
      if (diff >= 2) probAH15_home += prob;
      if (-diff >= 2) probAH15_away += prob;

      // Handicap +1.0
      if (diff >= 0) {
        probAH10Pos_home_num += prob;
        probAH10Pos_home_den += prob;
      } else if (diff <= -2) {
        probAH10Pos_home_den += prob;
      }

      if (-diff >= 0) {
        probAH10Pos_away_num += prob;
        probAH10Pos_away_den += prob;
      } else if (-diff <= -2) {
        probAH10Pos_away_den += prob;
      }

      // Handicap +1.5
      if (diff >= -1) probAH15Pos_home += prob;
      if (-diff >= -1) probAH15Pos_away += prob;
    }
  }

  // Normalização e cálculo dos Handicaps
  const total1X2 = probHome + probDraw + probAway || 1;
  probHome = probHome / total1X2;
  probDraw = probDraw / total1X2;
  probAway = probAway / total1X2;

  const probCasaAH00 = probAH00_home_den > 0 ? (probAH00_home_num / probAH00_home_den) : 0.5;
  const probForaAH00 = 1 - probCasaAH00;

  const probCasaAH10 = probAH10_home_den > 0 ? (probAH10_home_num / probAH10_home_den) : 0;
  const probForaAH10 = probAH10_away_den > 0 ? (probAH10_away_num / probAH10_away_den) : 0;

  const probCasaAH10Pos = probAH10Pos_home_den > 0 ? (probAH10Pos_home_num / probAH10Pos_home_den) : 1;
  const probForaAH10Pos = probAH10Pos_away_den > 0 ? (probAH10Pos_away_num / probAH10Pos_away_den) : 1;

  const probCasaAH15 = probAH15_home;
  const probForaAH15 = probAH15_away;

  // 1. Identifica o palpite PADRÃO (seco, sem handicap) mais interessante para a tela principal
  let bestTip = { market: '', selection: '', prob: 0, odd: 0 };

  if (probHome > 0.45 && probHome > probAway) {
    bestTip = { market: '1X2', selection: 'Casa Vence', prob: probHome, odd: 1 / probHome };
  } else if (probAway > 0.40 && probAway > probHome) {
    bestTip = { market: '1X2', selection: 'Fora Vence', prob: probAway, odd: 1 / probAway };
  } else if (probOver25 > 0.50) {
    bestTip = { market: 'Gols', selection: 'Mais de 2.5 Gols', prob: probOver25, odd: 1 / probOver25 };
  } else if (probBtts > 0.55) {
    bestTip = { market: 'Ambas Marcam', selection: 'Sim', prob: probBtts, odd: 1 / probBtts };
  } else if (probHome > 0.38 && probHome > probAway) {
    bestTip = { market: '1X2', selection: 'Casa Vence', prob: probHome, odd: 1 / probHome };
  } else if (probAway > 0.35 && probAway > probHome) {
    bestTip = { market: '1X2', selection: 'Fora Vence', prob: probAway, odd: 1 / probAway };
  } else {
    bestTip = { market: '1X2', selection: 'Empate', prob: probDraw, odd: 1 / probDraw };
  }

  // 2. Identifica se existe uma BOA OPORTUNIDADE DE HANDICAP para servir como Alerta/Proteção
  let bestHandicapTip = null;
  const probCasaAH05 = probHome + probDraw;
  const probForaAH05 = probAway + probDraw;

  if (probHome > 0.65 && probAH10_home_num > 0.55) {
    if (probAH15_home > 0.52) {
      bestHandicapTip = { market: 'Handicap Asiático', selection: 'Casa AH -1.5', prob: probAH15_home, odd: 1 / probAH15_home };
    } else {
      const probCond10 = probAH10_home_num / (probAH10_home_den || 1);
      bestHandicapTip = { market: 'Handicap Asiático', selection: 'Casa AH -1.0', prob: probCond10, odd: 1 / probCond10 };
    }
  } else if (probAway > 0.60 && probAH10_away_num > 0.55) {
    if (probForaAH15 > 0.52) {
      bestHandicapTip = { market: 'Handicap Asiático', selection: 'Fora AH -1.5', prob: probForaAH15, odd: 1 / probForaAH15 };
    } else {
      const probCond10 = probAH10_away_num / (probAH10_away_den || 1);
      bestHandicapTip = { market: 'Handicap Asiático', selection: 'Fora AH -1.0', prob: probCond10, odd: 1 / probCond10 };
    }
  } else if (probHome > 0.38 && probCasaAH00 > 0.55) {
    bestHandicapTip = { market: 'Handicap Asiático', selection: 'Casa AH 0.0', prob: probCasaAH00, odd: 1 / probCasaAH00 };
  } else if (probAway > 0.33 && probForaAH00 > 0.55) {
    bestHandicapTip = { market: 'Handicap Asiático', selection: 'Fora AH 0.0', prob: probForaAH00, odd: 1 / probForaAH00 };
  } else if (probCasaAH05 > 0.65 && probHome > probAway) {
    bestHandicapTip = { market: 'Handicap Asiático', selection: 'Casa AH +0.5', prob: probCasaAH05, odd: 1 / probCasaAH05 };
  } else if (probForaAH05 > 0.65 && probAway > probHome) {
    bestHandicapTip = { market: 'Handicap Asiático', selection: 'Fora AH +0.5', prob: probForaAH05, odd: 1 / probForaAH05 };
  }

  return {
    scoreMatrix,
    probHome,
    probDraw,
    probAway,
    probOver05,
    probOver15,
    probOver25,
    probOver35,
    probBtts,
    // Handicaps
    probCasaAH00,
    probForaAH00,
    probCasaAH10,
    probForaAH10,
    probCasaAH15,
    probForaAH15,
    probCasaAH10Pos,
    probForaAH10Pos,
    probAH15Pos_home,
    probAH15Pos_away,
    bestTip,
    bestHandicapTip
  };
}

export function formatPct(prob) {
  return (prob * 100).toFixed(1);
}

export function formatOdd(prob) {
  if (prob === 0) return "0.00";
  return (1 / prob).toFixed(2);
}

export function calculateDynamicHandicapProb(scoreMatrix, isHome, line) {
  if (!scoreMatrix || scoreMatrix.length === 0) return 0;
  
  const lineVal = parseFloat(line);
  if (isNaN(lineVal)) return 0;
  
  // Helper to sum probabilities matching a condition on (HomeGoals - AwayGoals)
  const getProbForDiff = (conditionFn) => {
    let sum = 0;
    for (let h = 0; h < scoreMatrix.length; h++) {
      for (let a = 0; a < scoreMatrix[h].length; a++) {
        const prob = scoreMatrix[h]?.[a] || 0;
        if (conditionFn(h - a)) {
          sum += prob;
        }
      }
    }
    return sum;
  };

  // Check if quarter line (ends in .25 or .75)
  const isQuarter = Math.abs(Math.round(lineVal * 100)) % 50 !== 0;

  if (isQuarter) {
    const line1 = lineVal - 0.25;
    const line2 = lineVal + 0.25;
    const p1 = calculateDynamicHandicapProb(scoreMatrix, isHome, line1);
    const p2 = calculateDynamicHandicapProb(scoreMatrix, isHome, line2);
    return (p1 + p2) / 2;
  }

  // If it's a half-line (ends in .5), no refund
  const isHalf = Math.abs(lineVal) % 1 === 0.5;

  if (isHalf) {
    return getProbForDiff(d => {
      const simDiff = isHome ? (d + lineVal) : (-d + lineVal);
      return simDiff > 0;
    });
  } else {
    // Integer line (ends in .0). Refund case when simulated diff == 0.
    const pWin = getProbForDiff(d => {
      const simDiff = isHome ? (d + lineVal) : (-d + lineVal);
      return simDiff > 0;
    });
    const pLoss = getProbForDiff(d => {
      const simDiff = isHome ? (d + lineVal) : (-d + lineVal);
      return simDiff < 0;
    });
    const total = pWin + pLoss;
    return total > 0 ? pWin / total : 0.5;
  }
}

