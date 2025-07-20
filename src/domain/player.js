// Player - Encapsula ações e estado do jogador
import { PLAYERS, getOpponentsFor, createGameKey, getPlayerIndex } from './tournament.js';
import { canAcceptChoice } from './gameStateMachine.js';
import eventBus from '../app/eventBus.js';

export class Player {
  constructor(name) {
    if (!PLAYERS.includes(name)) {
      throw new Error(`Jogador inválido: ${name}`);
    }
    
    this.name = name;
    this.activeGames = new Map(); // gameKey -> currentRound
    this.currentGame = null;
    this.currentRound = 1;
  }

  // ============ INFORMAÇÕES DO JOGADOR ============
  
  getName() {
    return this.name;
  }

  getOpponents() {
    return getOpponentsFor(this.name);
  }

  // ============ AÇÕES DE JOGO ============

  // Inicia novo jogo contra oponente
  startNewGame(opponent) {
    if (!this.canStartGameWith(opponent)) {
      throw new Error(`Não pode iniciar jogo com ${opponent}`);
    }

    const gameKey = createGameKey(this.name, opponent);
    this.currentGame = gameKey;
    this.currentRound = 1;
    this.activeGames.set(gameKey, 1);

    console.log(`🎮 Player ${this.name}: Iniciando jogo contra ${opponent}`);
    
    // Notifica o referee
    eventBus.emit('playerStartedGame', {
      player: this.name,
      opponent,
      gameKey
    });

    return gameKey;
  }

  // Retoma jogo existente
  resumeGame(gameKey, round = 1) {
    this.currentGame = gameKey;
    this.currentRound = round;
    this.activeGames.set(gameKey, round);

    console.log(`🎮 Player ${this.name}: Retomando jogo ${gameKey} na rodada ${round}`);
    
    eventBus.emit('playerResumedGame', {
      player: this.name,
      gameKey,
      round
    });

    return gameKey;
  }

  // Faz escolha na rodada atual
  makeChoice(choice) {
    if (!this.canMakeChoice()) {
      throw new Error('Não pode fazer escolha no momento');
    }

    console.log(`🎮 Player ${this.name}: Escolhendo ${choice} na rodada ${this.currentRound}`);

    // Notifica o referee
    eventBus.emit('playerMadeChoice', {
      player: this.name,
      gameKey: this.currentGame,
      round: this.currentRound,
      choice
    });

    return {
      gameKey: this.currentGame,
      round: this.currentRound,
      choice
    };
  }

  // Confirma que viu resultado e quer continuar
  continueToNextRound() {
    if (!this.currentGame) {
      throw new Error('Nenhum jogo ativo');
    }

    console.log(`🎮 Player ${this.name}: Continuando para próxima rodada`);

    eventBus.emit('playerContinued', {
      player: this.name,
      gameKey: this.currentGame,
      currentRound: this.currentRound
    });
  }

  // Volta ao dashboard
  backToDashboard() {
    console.log(`🎮 Player ${this.name}: Voltando ao dashboard`);
    
    this.currentGame = null;
    this.currentRound = 1;

    eventBus.emit('playerBackToDashboard', {
      player: this.name
    });
  }

  // ============ VALIDAÇÕES ============

  canStartGameWith(opponent) {
    return this.getOpponents().includes(opponent);
  }

  canMakeChoice() {
    return this.currentGame !== null && this.currentRound > 0;
  }

  isInGame() {
    return this.currentGame !== null;
  }

  // ============ ESTADO DO JOGO ============

  getCurrentGame() {
    return this.currentGame;
  }

  getCurrentRound() {
    return this.currentRound;
  }

  // Atualiza estado baseado em notificação do referee
  updateGameState(gameKey, round) {
    if (this.currentGame === gameKey) {
      this.currentRound = round;
      this.activeGames.set(gameKey, round);
      console.log(`🎮 Player ${this.name}: Estado atualizado - rodada ${round}`);
    }
  }

  // Finaliza jogo
  finishGame(gameKey) {
    if (this.currentGame === gameKey) {
      console.log(`🎮 Player ${this.name}: Jogo ${gameKey} finalizado`);
      this.currentGame = null;
      this.currentRound = 1;
    }
    this.activeGames.delete(gameKey);
  }

  // ============ INFORMAÇÕES PARA UI ============

  getPlayerIndex(gameKey) {
    return getPlayerIndex(gameKey, this.name);
  }

  getOpponentName(gameKey) {
    const [p1, p2] = gameKey.split('-');
    return p1 === this.name ? p2 : p1;
  }

  // Dados para dashboard
  getGameStatus() {
    return {
      currentGame: this.currentGame,
      currentRound: this.currentRound,
      activeGames: Array.from(this.activeGames.entries()),
      availableOpponents: this.getOpponents()
    };
  }
}