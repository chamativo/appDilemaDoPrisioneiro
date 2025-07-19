// Lógica pura para estados de jogo - MÁXIMO 200 LINHAS
import { scoreChoices } from './scoring.js';

// Tipos conforme CONTRATOS DE DADOS da especificação
export const PLAYERS = ['Arthur', 'Laura', 'Sergio', 'Larissa'];

// Cria Round vazio conforme interface da especificação
export function createRound(roundNumber) {
  return {
    round: roundNumber,
    p1Choice: null,
    p2Choice: null,
    p1Points: null,
    p2Points: null,
    resolved: false
  };
}

// Cria GameRecord conforme interface da especificação  
export function createGameRecord(gameKey, p1, p2) {
  return {
    gameKey,
    p1,
    p2,
    rounds: Array.from({ length: 10 }, (_, i) => createRound(i + 1)),
    p1Total: 0,
    p2Total: 0,
    status: 'pending'
  };
}

// Aplica escolha em uma rodada
export function applyChoiceToRound(round, playerIndex, choice) {
  const newRound = { ...round };
  if (playerIndex === 0) {
    newRound.p1Choice = choice;
  } else {
    newRound.p2Choice = choice;
  }
  return newRound;
}

// Resolve rodada quando ambos escolheram
export function resolveRound(round) {
  if (!round.p1Choice || !round.p2Choice) return round;
  
  const [p1Points, p2Points] = scoreChoices(round.p1Choice, round.p2Choice);
  
  return {
    ...round,
    p1Points,
    p2Points,
    resolved: true
  };
}

// Atualiza totais do jogo
export function updateGameTotals(game) {
  const resolvedRounds = game.rounds.filter(r => r.resolved);
  const p1Total = resolvedRounds.reduce((sum, r) => sum + r.p1Points, 0);
  const p2Total = resolvedRounds.reduce((sum, r) => sum + r.p2Points, 0);
  
  return {
    ...game,
    p1Total,
    p2Total,
    status: resolvedRounds.length === 10 ? 'complete' : 'active'
  };
}