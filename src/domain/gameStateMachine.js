// Máquina de Estados do Jogo - FUNÇÃO PURA
export const GAME_STATES = {
  WAITING_CHOICES: 'WAITING_CHOICES',     // Aguardando escolhas dos jogadores
  SHOWING_RESULT: 'SHOWING_RESULT',       // Mostrando resultado (com botão continuar)
  PREPARING_NEXT: 'PREPARING_NEXT',       // Preparando próxima rodada
  GAME_COMPLETE: 'GAME_COMPLETE'          // Jogo finalizado
};

// Estado inicial de uma rodada
export function createRoundState(round) {
  return {
    round,
    state: GAME_STATES.WAITING_CHOICES,
    choices: {},
    result: null,
    waitingFor: ['p1', 'p2'] // Quem ainda precisa escolher
  };
}

// Aplica escolha de jogador
export function applyPlayerChoice(roundState, playerIndex, choice) {
  const newState = { ...roundState };
  newState.choices[playerIndex] = choice;
  newState.waitingFor = newState.waitingFor.filter(p => p !== playerIndex);
  
  // Se ambos escolheram, muda para SHOWING_RESULT
  if (newState.waitingFor.length === 0) {
    newState.state = GAME_STATES.SHOWING_RESULT;
  }
  
  return newState;
}

// Adiciona resultado calculado
export function addResult(roundState, result) {
  return {
    ...roundState,
    result,
    state: GAME_STATES.SHOWING_RESULT
  };
}

// Avança para próxima rodada ou finaliza jogo
export function advanceToNext(roundState, maxRounds = 10) {
  if (roundState.round >= maxRounds) {
    return {
      ...roundState,
      state: GAME_STATES.GAME_COMPLETE
    };
  }
  
  return {
    round: roundState.round + 1,
    state: GAME_STATES.WAITING_CHOICES,
    choices: {},
    result: null,
    waitingFor: ['p1', 'p2']
  };
}

// Verifica se pode aceitar escolha
export function canAcceptChoice(roundState, playerIndex) {
  return roundState.state === GAME_STATES.WAITING_CHOICES && 
         roundState.waitingFor.includes(playerIndex);
}

// Verifica se deve mostrar resultado
export function shouldShowResult(roundState) {
  return roundState.state === GAME_STATES.SHOWING_RESULT && 
         roundState.result !== null;
}

// Verifica se pode avançar
export function canAdvance(roundState) {
  return roundState.state === GAME_STATES.SHOWING_RESULT;
}

// Verifica se jogo terminou
export function isGameComplete(roundState) {
  return roundState.state === GAME_STATES.GAME_COMPLETE;
}