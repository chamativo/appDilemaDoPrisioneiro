// GameService - orquestração dos fluxos de jogo COM MÁQUINA DE ESTADOS
import GameRepository from '../data/gameRepo.js';
import { resolveRound, updateGameTotals } from '../domain/gameState.js';
import { getPlayerIndex } from '../domain/tournament.js';
import { 
  GAME_STATES, 
  createRoundState, 
  applyPlayerChoice, 
  addResult, 
  advanceToNext, 
  canAcceptChoice, 
  shouldShowResult, 
  canAdvance, 
  isGameComplete 
} from '../domain/gameStateMachine.js';
import eventBus from './eventBus.js';

class GameService {
  constructor() {
    this.gameRepo = new GameRepository();
    this.gameStates = new Map(); // Estados das rodadas em memória
  }

  // Conecta serviços
  async connect(firebaseConfig) {
    await this.gameRepo.connect(firebaseConfig);
  }

  // FLUXO: UI chama submitChoice COM MÁQUINA DE ESTADOS
  async submitChoice(player, gameKey, round, choice) {
    try {
      console.log('🎯 MÁQUINA: submitChoice', { player, gameKey, round, choice });
      
      // Valida entrada
      if (!player || !gameKey || !round || !choice) {
        throw new Error('Parâmetros inválidos');
      }

      // Obtém estado atual da rodada
      const stateKey = `${gameKey}-${round}`;
      let roundState = this.gameStates.get(stateKey) || createRoundState(round);
      
      // Verifica se pode aceitar escolha
      const playerIndex = getPlayerIndex(gameKey, player) === 0 ? 'p1' : 'p2';
      if (!canAcceptChoice(roundState, playerIndex)) {
        console.log('🎯 MÁQUINA: Escolha rejeitada - estado inválido', roundState.state);
        return;
      }

      // Aplica escolha na máquina de estados
      roundState = applyPlayerChoice(roundState, playerIndex, choice);
      this.gameStates.set(stateKey, roundState);
      
      console.log('🎯 MÁQUINA: Estado atualizado', roundState);

      // Salva no Firebase
      await this.gameRepo.submitChoice(player, gameKey, round, choice);
      
      // Se ambos escolheram, processa resultado
      if (roundState.state === GAME_STATES.SHOWING_RESULT) {
        this.processRoundResult(gameKey, round, roundState);
      }
      
      eventBus.emit('choiceSubmitted', { player, gameKey, round, choice });
    } catch (error) {
      eventBus.emit('error', { type: 'submitChoice', error });
    }
  }

  // Listener detecta mudanças e sincroniza com máquina de estados
  setupGameListener(gameKey) {
    this.gameRepo.onGameChange(gameKey, (snapshot) => {
      const gameData = snapshot.val();
      if (!gameData) return;

      this.syncWithFirebase(gameKey, gameData);
    });
  }

  // Sincroniza dados do Firebase com máquina de estados
  syncWithFirebase(gameKey, gameData) {
    console.log('🎯 MÁQUINA: Sincronizando com Firebase', gameKey, gameData);
    
    // Não processa mais automaticamente - apenas eventos específicos
    eventBus.emit('gameUpdated', { gameKey, gameData });
  }

  // Processa resultado quando ambos jogadores escolheram
  processRoundResult(gameKey, round, roundState) {
    console.log('🎯 MÁQUINA: Processando resultado da rodada', round);
    
    const [p1, p2] = gameKey.split('-');
    const p1Choice = roundState.choices.p1;
    const p2Choice = roundState.choices.p2;
    
    // Calcula pontos
    const roundData = {
      round,
      p1Choice,
      p2Choice,
      p1Points: null,
      p2Points: null,
      resolved: false
    };
    
    const resolvedRound = resolveRound(roundData);
    console.log('🎯 MÁQUINA: Resultado calculado:', resolvedRound);
    
    // Atualiza máquina de estados
    const stateKey = `${gameKey}-${round}`;
    const updatedState = addResult(roundState, {
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      player1Points: resolvedRound.p1Points,
      player2Points: resolvedRound.p2Points
    });
    this.gameStates.set(stateKey, updatedState);
    
    // Salva resultado no Firebase
    this.gameRepo.processRoundResult(gameKey, round, {
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      player1Points: resolvedRound.p1Points,
      player2Points: resolvedRound.p2Points
    });
    
    // COMANDA UI para mostrar resultado
    console.log('🎯 MÁQUINA: Comandando UI para mostrar resultado');
    eventBus.emit('showGameResult', {
      gameKey,
      round,
      result: updatedState.result
    });
  }
  
  // Avança para próxima rodada (chamado pelo botão da UI)
  advanceToNextRound(gameKey, currentRound) {
    console.log('🎯 MÁQUINA: Avançando para próxima rodada', gameKey, currentRound);
    
    const stateKey = `${gameKey}-${currentRound}`;
    const currentState = this.gameStates.get(stateKey);
    
    if (!currentState || !canAdvance(currentState)) {
      console.log('🎯 MÁQUINA: Não pode avançar - estado inválido');
      return;
    }
    
    // Cria próximo estado
    const nextState = advanceToNext(currentState);
    
    if (isGameComplete(nextState)) {
      console.log('🎯 MÁQUINA: Jogo completo!');
      eventBus.emit('showGameComplete', { gameKey });
    } else {
      // Inicia próxima rodada
      const nextStateKey = `${gameKey}-${nextState.round}`;
      this.gameStates.set(nextStateKey, nextState);
      
      console.log('🎯 MÁQUINA: Iniciando rodada', nextState.round);
      eventBus.emit('startNextRound', {
        gameKey,
        round: nextState.round
      });
    }
  }
  
  // Método público para UI avançar manualmente
  requestAdvanceRound(gameKey, currentRound) {
    this.advanceToNextRound(gameKey, currentRound);
  }

  // Para de escutar jogo
  stopListening(gameKey) {
    this.gameRepo.stopListening(gameKey);
  }
}

export default GameService;