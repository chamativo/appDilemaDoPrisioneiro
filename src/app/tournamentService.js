// TournamentService - CONTROLADOR PRINCIPAL DO TORNEIO
import GameRepository from '../data/gameRepo.js';
import { calculateRanking, generateAllGamePairs, getOpponentsFor, createGameKey } from '../domain/tournament.js';
import eventBus from './eventBus.js';

class TournamentService {
  constructor() {
    this.gameRepo = new GameRepository();
    this.currentPlayer = null;
    this.setupEventListeners();
  }

  // Conecta serviços
  async connect(firebaseConfig) {
    await this.gameRepo.connect(firebaseConfig);
  }

  // ============ EVENT LISTENERS ============
  
  setupEventListeners() {
    // Recebe controle quando jogador é selecionado
    eventBus.on('playerSelected', (data) => {
      this.handlePlayerSelected(data.player);
    });

    // Recebe notificação quando jogo é finalizado pelo Referee
    eventBus.on('refereeGameComplete', (data) => {
      this.handleGameCompleted(data);
    });

    // Jogador saiu - perde controle
    eventBus.on('changePlayer', () => {
      this.currentPlayer = null;
    });
  }

  // ============ CONTROLADOR DO FLUXO ============

  async handlePlayerSelected(playerName) {
    console.log(`🏆 TOURNAMENT: Assumindo controle para jogador ${playerName}`);
    this.currentPlayer = playerName;
    
    // Carrega dados do torneio para este jogador
    const dashboardData = await this.loadPlayerDashboardData(playerName);
    
    // Fornece dados para uiRouter
    eventBus.emit('tournamentDashboardReady', {
      player: playerName,
      ...dashboardData
    });
  }

  async handleGameCompleted(data) {
    console.log(`🏆 TOURNAMENT: Jogo ${data.gameKey} finalizado`, data.finalScores);
    
    // Atualiza scores totais no Firebase
    await this.updatePlayerScores(data.gameKey, data.finalScores);
    
    // Retoma controle após partida
    if (this.currentPlayer) {
      console.log(`🏆 TOURNAMENT: Retomando controle para ${this.currentPlayer}`);
      const dashboardData = await this.loadPlayerDashboardData(this.currentPlayer);
      
      eventBus.emit('tournamentDashboardReady', {
        player: this.currentPlayer,
        ...dashboardData
      });
    }
  }

  // ============ GESTÃO DE ESTADOS DOS JOGOS ============

  async loadPlayerDashboardData(playerName) {
    console.log(`🏆 TOURNAMENT: Carregando dados para ${playerName}`);
    
    const opponents = getOpponentsFor(playerName);
    const allGames = await this.getAllGamesForPlayer(playerName);
    
    return {
      pending: allGames.filter(game => game.status === 'pending'),
      active: allGames.filter(game => game.status === 'active'), 
      completed: allGames.filter(game => game.status === 'completed'),
      new: this.getNewGamesForPlayer(playerName, allGames)
    };
  }

  async getAllGamesForPlayer(playerName) {
    // TODO: Implementar busca real no Firebase
    const opponents = getOpponentsFor(playerName);
    const games = [];
    
    for (const opponent of opponents) {
      const gameKey = createGameKey(playerName, opponent);
      
      // TODO: Buscar estado real do Firebase
      games.push({
        gameKey,
        opponent,
        status: 'new', // Temporário até implementar busca real
        currentRound: 1,
        playerScore: 0,
        opponentScore: 0
      });
    }
    
    return games;
  }

  getNewGamesForPlayer(playerName, existingGames) {
    const opponents = getOpponentsFor(playerName);
    const existingOpponents = existingGames.map(game => game.opponent);
    
    return opponents
      .filter(opponent => !existingOpponents.includes(opponent))
      .map(opponent => ({
        opponent,
        gameKey: createGameKey(playerName, opponent)
      }));
  }

  // ============ DELEGAÇÃO AO REFEREE ============

  // TournamentService delega partida ao Referee
  delegateGameToReferee(gameKey, player, opponent) {
    console.log(`🏆 TOURNAMENT: Delegando jogo ${gameKey} ao Referee`);
    
    // Referee assume controle da partida
    eventBus.emit('tournamentDelegatesGame', {
      gameKey,
      player,
      opponent
    });
  }

  // ============ GESTÃO DE SCORES ============

  async updatePlayerScores(gameKey, finalScores) {
    try {
      console.log(`🏆 TOURNAMENT: Atualizando scores totais`, finalScores);
      
      // TODO: Buscar scores atuais e somar
      await this.gameRepo.updateTotalScores(finalScores);
      
      eventBus.emit('scoresUpdated', finalScores);
    } catch (error) {
      console.error('🏆 TOURNAMENT: Erro ao atualizar scores:', error);
      eventBus.emit('error', { type: 'updateScores', error });
    }
  }

  // ============ UTILITÁRIOS ============

  // Calcula ranking geral
  async calculateGeneralRanking() {
    // TODO: Buscar scores do Firebase
    const scores = {}; // Temporário
    return calculateRanking(scores);
  }

  // Reset completo do torneio
  async resetTournament() {
    try {
      console.log(`🏆 TOURNAMENT: Resetando torneio completo`);
      await this.gameRepo.resetAll();
      eventBus.emit('tournamentReset');
    } catch (error) {
      eventBus.emit('error', { type: 'resetTournament', error });
    }
  }

  // Gera todos os jogos possíveis
  getAllGamePairs() {
    return generateAllGamePairs();
  }
}

export default TournamentService;