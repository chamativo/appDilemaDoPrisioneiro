// Referee - Árbitro puro que processa regras e sincroniza estado
import GameRepository from '../data/gameRepo.js';
import { resolveRound } from '../domain/gameState.js';
import { 
  GAME_STATES, 
  createRoundState, 
  applyPlayerChoice, 
  addResult, 
  advanceToNext, 
  canAcceptChoice, 
  isGameComplete 
} from '../domain/gameStateMachine.js';
import eventBus from './eventBus.js';

class Referee {
  constructor() {
    this.gameRepo = new GameRepository();
    this.gameStates = new Map(); // gameKey-round -> state
    this.setupEventListeners();
  }

  // Conecta serviços
  async connect(firebaseConfig) {
    await this.gameRepo.connect(firebaseConfig);
  }

  // ============ EVENT LISTENERS ============
  
  setupEventListeners() {
    // TournamentService delega novos jogos
    eventBus.on('tournamentDelegatesNewGame', (data) => {
      this.handleTournamentNewGame(data);
    });

    // TournamentService delega jogos para retomar
    eventBus.on('tournamentDelegatesResumeGame', (data) => {
      this.handleTournamentResumeGame(data);
    });

    // Player fez escolha
    eventBus.on('makeChoice', (data) => {
      this.handlePlayerChoice(data);
    });

    // Player quer continuar para próxima rodada
    eventBus.on('advanceToNextRound', (data) => {
      this.handlePlayerContinued(data);
    });

    // Player voltou ao dashboard
    eventBus.on('backToDashboard', (data) => {
      this.handlePlayerBackToDashboard(data);
    });
  }

  // ============ HANDLERS DE EVENTOS ============

  async handleTournamentNewGame(data) {
    const { gameKey, player, opponent, currentPlayer } = data;
    console.log(`🏁 REFEREE: TournamentService delegou novo jogo ${gameKey} (${player} vs ${opponent})`);
    
    // Cria estado inicial da rodada 1
    const stateKey = `${gameKey}-1`;
    const initialState = createRoundState(1);
    this.gameStates.set(stateKey, initialState);

    // Configura listener do Firebase
    this.setupGameListener(gameKey);

    // Notifica UI para mostrar tela de jogo
    eventBus.emit('refereeGameStarted', {
      gameKey,
      round: 1,
      state: GAME_STATES.WAITING_CHOICES,
      currentPlayer: currentPlayer
    });
  }

  async handleTournamentResumeGame(data) {
    const { gameKey, player, round, currentPlayer } = data;
    console.log(`🏁 REFEREE: TournamentService delegou retomar jogo ${gameKey} rodada ${round}`);
    
    // TODO: Recuperar estado do Firebase se necessário
    const stateKey = `${gameKey}-${round}`;
    if (!this.gameStates.has(stateKey)) {
      const state = createRoundState(round);
      this.gameStates.set(stateKey, state);
    }

    this.setupGameListener(gameKey);

    eventBus.emit('refereeGameResumed', {
      gameKey,
      round,
      state: this.gameStates.get(stateKey).state,
      currentPlayer: currentPlayer
    });
  }

  async handlePlayerBackToDashboard(data) {
    console.log(`🏁 REFEREE: Player voltou ao dashboard`);
    // Para todos os listeners ativos
    // TODO: Implementar limpeza de listeners
  }

  async handlePlayerChoice(data) {
    const { player, choice, gameKey, round } = data;
    console.log(`🏁 REFEREE: Player ${player} escolheu ${choice} na rodada ${round || 'atual'}`);

    // Se não temos gameKey/round, precisa pegar do estado atual
    if (!gameKey || !player) {
      console.error('🏁 REFEREE: gameKey ou player não fornecido na escolha');
      return;
    }

    const currentRound = round || this.getCurrentRound(gameKey);
    const stateKey = `${gameKey}-${currentRound}`;
    let roundState = this.gameStates.get(stateKey);
    
    if (!roundState) {
      console.log(`🏁 REFEREE: Criando estado para rodada ${currentRound}`);
      roundState = createRoundState(currentRound);
    }

    // Determina qual jogador fez a escolha
    const [p1, p2] = gameKey.split('-');
    const playerIndex = player === p1 ? 'p1' : 'p2';
    
    // Verifica se pode aceitar escolha
    if (!canAcceptChoice(roundState, playerIndex)) {
      console.log(`🏁 REFEREE: Escolha rejeitada - estado inválido`);
      return;
    }

    // Aplica escolha
    roundState = applyPlayerChoice(roundState, playerIndex, choice);
    this.gameStates.set(stateKey, roundState);

    // Salva no Firebase
    await this.gameRepo.submitChoice(player, gameKey, currentRound, choice);

    // Se ambos escolheram, processa resultado
    if (roundState.state === GAME_STATES.SHOWING_RESULT) {
      await this.processRoundResult(gameKey, currentRound, roundState);
    }

    console.log(`🏁 REFEREE: Estado atualizado:`, roundState);
  }

  async handlePlayerContinued(data) {
    const { player, gameKey } = data;
    
    // Busca a última rodada que teve resultado (não a próxima rodada)
    const lastCompletedRound = this.getLastCompletedRound(gameKey);
    console.log(`🏁 REFEREE: Player ${player} quer continuar da rodada ${lastCompletedRound}`);

    const stateKey = `${gameKey}-${lastCompletedRound}`;
    const currentState = this.gameStates.get(stateKey);

    if (!currentState || currentState.state !== GAME_STATES.SHOWING_RESULT) {
      console.log(`🏁 REFEREE: Não pode continuar - estado inválido`);
      return;
    }

    // Avança para próxima rodada
    const nextState = advanceToNext(currentState);
    
    if (isGameComplete(nextState)) {
      console.log(`🏁 REFEREE: Jogo ${gameKey} completo!`);
      
      // Calcula pontos finais
      const finalScores = this.calculateFinalScores(gameKey);
      console.log(`🏁 REFEREE: Pontos finais:`, finalScores);
      
      // Salva jogo como completo no Firebase
      await this.gameRepo.completeGame(gameKey, finalScores);
      
      // Primeiro mostra resultado final na UI
      eventBus.emit('showGameComplete', {
        gameKey,
        scores: finalScores
      });
      
      // Depois notifica TournamentService
      eventBus.emit('refereeGameComplete', { 
        gameKey, 
        finalScores 
      });
    } else {
      // Cria próximo estado
      const nextStateKey = `${gameKey}-${nextState.round}`;
      this.gameStates.set(nextStateKey, nextState);

      console.log(`🏁 REFEREE: Iniciando rodada ${nextState.round}`);
      eventBus.emit('refereeRoundStarted', {
        gameKey,
        round: nextState.round
      });
    }
  }

  // ============ PROCESSAMENTO ============

  async processRoundResult(gameKey, round, roundState) {
    console.log(`🏁 REFEREE: Processando resultado da rodada ${round}`);

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
    console.log(`🏁 REFEREE: Resultado calculado:`, resolvedRound);

    // Atualiza estado com resultado
    const stateKey = `${gameKey}-${round}`;
    const updatedState = addResult(roundState, {
      player1: p1,
      player2: p2,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      player1Points: resolvedRound.p1Points,
      player2Points: resolvedRound.p2Points
    });
    this.gameStates.set(stateKey, updatedState);

    // Salva resultado no Firebase
    await this.gameRepo.processRoundResult(gameKey, round, {
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      player1Points: resolvedRound.p1Points,
      player2Points: resolvedRound.p2Points
    });

    // Notifica UI para mostrar resultado
    eventBus.emit('refereeShowResult', {
      gameKey,
      round,
      result: updatedState.result
    });
  }

  // ============ FIREBASE SYNC ============

  setupGameListener(gameKey) {
    this.gameRepo.onGameChange(gameKey, (snapshot) => {
      const gameData = snapshot.val();
      if (!gameData) return;

      console.log(`🏁 REFEREE: Firebase sync para ${gameKey}:`, gameData);
      
      // Processa dados do Firebase para sincronizar estado entre abas
      this.syncGameStateFromFirebase(gameKey, gameData);
      
      eventBus.emit('refereeGameSync', { gameKey, gameData });
    });
  }

  // Sincroniza estado local com dados do Firebase
  syncGameStateFromFirebase(gameKey, gameData) {
    const { choices, results } = gameData;
    
    if (choices) {
      // Para cada rodada com escolhas
      Object.keys(choices).forEach(round => {
        const roundChoices = choices[round];
        const stateKey = `${gameKey}-${round}`;
        
        console.log(`🏁 REFEREE: Sincronizando rodada ${round}:`, roundChoices);
        
        // Se já processada, skip
        if (results && results[round]) {
          console.log(`🏁 REFEREE: Rodada ${round} já processada`);
          return;
        }
        
        // Reconstrói estado baseado no Firebase
        let roundState = this.gameStates.get(stateKey) || createRoundState(parseInt(round));
        
        // Aplica escolhas do Firebase
        const [p1, p2] = gameKey.split('-');
        if (roundChoices[p1]) {
          roundState = applyPlayerChoice(roundState, 'p1', roundChoices[p1].choice);
        }
        if (roundChoices[p2]) {
          roundState = applyPlayerChoice(roundState, 'p2', roundChoices[p2].choice);
        }
        
        this.gameStates.set(stateKey, roundState);
        console.log(`🏁 REFEREE: Estado sincronizado:`, roundState);
        
        // Se ambos escolheram E ainda não processamos, processa agora
        if (roundState.state === GAME_STATES.SHOWING_RESULT && !roundState.result) {
          console.log(`🏁 REFEREE: Detectou ambas escolhas - processando resultado`);
          this.processRoundResult(gameKey, parseInt(round), roundState);
        }
      });
    }
  }

  stopListening(gameKey) {
    this.gameRepo.stopListening(gameKey);
    
    // Limpa estados do jogo
    const keysToDelete = [];
    for (const key of this.gameStates.keys()) {
      if (key.startsWith(gameKey)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.gameStates.delete(key));
  }

  // ============ CÁLCULOS ============

  calculateFinalScores(gameKey) {
    const [p1, p2] = gameKey.split('-');
    let p1Total = 0;
    let p2Total = 0;

    // Soma pontos de todas as rodadas processadas
    for (let round = 1; round <= 10; round++) {
      const stateKey = `${gameKey}-${round}`;
      const roundState = this.gameStates.get(stateKey);
      
      if (roundState && roundState.result) {
        p1Total += roundState.result.player1Points || 0;
        p2Total += roundState.result.player2Points || 0;
      }
    }

    console.log(`🏁 REFEREE: Calculando pontos ${p1}=${p1Total}, ${p2}=${p2Total}`);
    
    return {
      [p1]: p1Total,
      [p2]: p2Total
    };
  }

  // ============ API PÚBLICA ============

  getGameState(gameKey, round) {
    const stateKey = `${gameKey}-${round}`;
    return this.gameStates.get(stateKey);
  }

  getCurrentRound(gameKey) {
    // Busca a última rodada ativa para este jogo
    for (let round = 10; round >= 1; round--) {
      const stateKey = `${gameKey}-${round}`;
      if (this.gameStates.has(stateKey)) {
        return round;
      }
    }
    return 1; // Default para rodada 1
  }

  getLastCompletedRound(gameKey) {
    // Busca a última rodada com resultado (SHOWING_RESULT)
    for (let round = 10; round >= 1; round--) {
      const stateKey = `${gameKey}-${round}`;
      const state = this.gameStates.get(stateKey);
      if (state && state.state === GAME_STATES.SHOWING_RESULT) {
        return round;
      }
    }
    return 1; // Default para rodada 1
  }
}

export default Referee;