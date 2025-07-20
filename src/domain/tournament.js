// Lógica pura para torneio - MÁXIMO 200 LINHAS
export const PLAYERS = ['Arthur', 'Laura', 'Sergio', 'Larissa'];

// Gera gameKey em ordem alfabética conforme especificação
export function createGameKey(player1, player2) {
  return [player1, player2].sort().join('-');
}

// Gera todos os pares possíveis do torneio
export function generateAllGamePairs() {
  const pairs = [];
  for (let i = 0; i < PLAYERS.length; i++) {
    for (let j = i + 1; j < PLAYERS.length; j++) {
      pairs.push(createGameKey(PLAYERS[i], PLAYERS[j]));
    }
  }
  return pairs;
}

// Obtém oponentes disponíveis para um jogador
export function getOpponentsFor(player) {
  return PLAYERS.filter(p => p !== player);
}

// Verifica se jogador é player1 ou player2 no gameKey
export function getPlayerIndex(gameKey, player) {
  const [p1, p2] = gameKey.split('-');
  if (player === p1) return 0;
  if (player === p2) return 1;
  return -1;
}

// Calcula ranking geral baseado em scores totais
export function calculateRanking(scores) {
  return PLAYERS
    .map(player => ({
      player,
      totalPoints: scores[player] || 0
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}