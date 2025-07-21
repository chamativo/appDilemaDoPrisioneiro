// TournamentService - CONTROLADOR PRINCIPAL DO TORNEIO
import GameRepository from '../data/gameRepo.js';
import { calculateRanking, generateAllGamePairs, getOpponentsFor, createGameKey } from '../domain/tournament.js';
import eventBus from './eventBus.js';

class TournamentService {
  constructor() {
    this.gameRepo = new GameRepository();
    this.currentPlayerName = null;
    this.currentPlayerInstance = null;
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

    // Escuta eventos do dashboard
    eventBus.on('startNewGame', (data) => {
      this.handleStartNewGame(data);
    });

    eventBus.on('resumeGame', (data) => {
      this.handleResumeGame(data);
    });

    // Recebe notificação quando jogo é finalizado pelo Referee
    eventBus.on('refereeGameComplete', (data) => {
      this.handleGameCompleted(data);
    });

    // Player volta ao dashboard
    eventBus.on('backToDashboard', () => {
      this.handleBackToDashboard();
    });

    // Jogador saiu - perde controle
    eventBus.on('changePlayer', () => {
      this.currentPlayerName = null;
      this.currentPlayerInstance = null;
    });
  }

  // ============ CONTROLADOR DO FLUXO ============

  // Método chamado pelo main.js para definir o player atual
  setCurrentPlayer(playerInstance) {
    this.currentPlayerInstance = playerInstance;
    this.currentPlayerName = playerInstance.getName();
    
    console.log(`🏆 TOURNAMENT: Assumindo controle para jogador ${this.currentPlayerName}`);
    
    // Dispara o fluxo do torneio
    this.handlePlayerSelected(this.currentPlayerName);
  }

  async handlePlayerSelected(playerName) {
    console.log(`🏆 TOURNAMENT: Carregando dados do torneio para ${playerName}`);
    
    // Navega para dashboard
    eventBus.emit('tournamentNavigateToDashboard', { player: playerName });
    
    // Carrega dados do torneio para este jogador
    const dashboardData = await this.loadPlayerDashboardData(playerName);
    
    // Fornece dados para uiRouter
    eventBus.emit('tournamentDashboardReady', {
      player: playerName,
      ...dashboardData
    });
  }

  async handleStartNewGame(data) {
    console.log(`🏆 TOURNAMENT: Iniciando novo jogo ${this.currentPlayerName} vs ${data.opponent}`);
    
    const gameKey = createGameKey(this.currentPlayerName, data.opponent);
    
    // Delega ao Referee
    eventBus.emit('tournamentDelegatesNewGame', {
      gameKey,
      player: this.currentPlayerName,
      opponent: data.opponent,
      currentPlayer: this.currentPlayerInstance
    });
  }

  async handleResumeGame(data) {
    console.log(`🏆 TOURNAMENT: Retomando jogo ${data.gameKey} na rodada ${data.round || 1}`);
    
    // Busca histórico completo do jogo do Firebase
    const gameHistory = await this.loadGameHistory(data.gameKey);
    console.log(`🏆 TOURNAMENT: Histórico carregado:`, gameHistory);
    
    // Delega ao Referee com histórico
    eventBus.emit('tournamentDelegatesResumeGame', {
      gameKey: data.gameKey,
      player: this.currentPlayerName,
      round: data.round || 1,
      currentPlayer: this.currentPlayerInstance,
      gameHistory: gameHistory
    });
  }

  async handleGameCompleted(data) {
    console.log(`🏆 TOURNAMENT: Jogo ${data.gameKey} finalizado`, data.finalScores);
    
    // Atualiza scores totais no Firebase
    await this.updatePlayerScores(data.gameKey, data.finalScores);
    
    // Retoma controle após partida
    if (this.currentPlayerName) {
      console.log(`🏆 TOURNAMENT: Retomando controle para ${this.currentPlayerName}`);
      const dashboardData = await this.loadPlayerDashboardData(this.currentPlayerName);
      
      eventBus.emit('tournamentDashboardReady', {
        player: this.currentPlayerName,
        ...dashboardData
      });
    }
  }

  async handleBackToDashboard() {
    console.log(`🏆 TOURNAMENT: Player voltou ao dashboard - assumindo controle`);
    
    if (this.currentPlayerName) {
      // Navega para dashboard
      eventBus.emit('tournamentNavigateToDashboard', { player: this.currentPlayerName });
      
      // Carrega dados atualizados
      const dashboardData = await this.loadPlayerDashboardData(this.currentPlayerName);
      
      eventBus.emit('tournamentDashboardReady', {
        player: this.currentPlayerName,
        ...dashboardData
      });
    }
  }

  // ============ GESTÃO DE ESTADOS DOS JOGOS ============

  async loadPlayerDashboardData(playerName) {
    console.log(`🏆 TOURNAMENT: Carregando dados para ${playerName}`);
    
    const opponents = getOpponentsFor(playerName);
    const allGames = await this.getAllGamesForPlayer(playerName);
    
    console.log(`🏆 TOURNAMENT: Jogos encontrados para ${playerName}:`, allGames);
    
    const categorized = {
      active: allGames.filter(game => game.status === 'active'), 
      completed: allGames.filter(game => game.status === 'completed'),
      new: this.getNewGamesForPlayer(playerName, allGames)
    };
    
    console.log(`🏆 TOURNAMENT: Jogos categorizados:`, categorized);
    
    return categorized;
  }

  async getAllGamesForPlayer(playerName) {
    console.log(`🏆 TOURNAMENT: Buscando jogos para ${playerName} no Firebase`);
    
    const opponents = getOpponentsFor(playerName);
    const games = [];
    
    for (const opponent of opponents) {
      const gameKey = createGameKey(playerName, opponent);
      
      try {
        // Busca dados do jogo no Firebase
        const gameData = await this.gameRepo.getGameData(gameKey);
        console.log(`🏆 TOURNAMENT: Dados do jogo ${gameKey}:`, gameData);
        
        if (gameData && gameData.status) {
          // Jogo existe no Firebase
          games.push({
            gameKey,
            opponent,
            status: gameData.status,
            currentRound: gameData.currentRound || 1,
            playerScore: gameData.scores?.[playerName] || 0,
            opponentScore: gameData.scores?.[opponent] || 0
          });
          console.log(`🏆 TOURNAMENT: Jogo ${gameKey} adicionado com status '${gameData.status}'`);
        } else {
          // Jogo não existe - disponível para começar
          games.push({
            gameKey,
            opponent,
            status: 'new',
            currentRound: 1,
            playerScore: 0,
            opponentScore: 0
          });
          console.log(`🏆 TOURNAMENT: Jogo ${gameKey} adicionado como 'new' (não existe no Firebase)`);
        }
      } catch (error) {
        console.error(`🏆 TOURNAMENT: Erro ao buscar jogo ${gameKey}:`, error);
        // Em caso de erro, assume como novo
        games.push({
          gameKey,
          opponent,
          status: 'new',
          currentRound: 1,
          playerScore: 0,
          opponentScore: 0
        });
        console.log(`🏆 TOURNAMENT: Jogo ${gameKey} adicionado como 'new' (erro no Firebase)`);
      }
    }
    
    console.log(`🏆 TOURNAMENT: Encontrados ${games.length} jogos para ${playerName}`);
    return games;
  }

  getNewGamesForPlayer(playerName, existingGames) {
    // Filtra apenas jogos com status 'new'
    return existingGames.filter(game => game.status === 'new');
  }

  // ============ DELEGAÇÃO AO REFEREE ============
  
  // Os eventos de delegação já são emitidos nos handlers acima

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

  // Calcula ranking geral com pontos e jogos completos
  async calculateGeneralRanking() {
    try {
      console.log(`🏆 TOURNAMENT: Calculando ranking geral`);
      
      const opponents = ['Arthur', 'Laura', 'Sergio', 'Larissa'];
      const ranking = [];
      
      for (const player of opponents) {
        let totalPoints = 0;
        let completedGames = 0;
        
        // Para cada oponente, verifica jogos completos
        for (const opponent of opponents) {
          if (player === opponent) continue;
          
          const gameKey = createGameKey(player, opponent);
          try {
            const gameData = await this.gameRepo.getGameData(gameKey);
            
            if (gameData && gameData.status === 'completed' && gameData.scores) {
              totalPoints += gameData.scores[player] || 0;
              completedGames++;
            }
          } catch (error) {
            console.log(`🏆 TOURNAMENT: Erro ao buscar jogo ${gameKey}:`, error);
          }
        }
        
        ranking.push({
          name: player,
          totalPoints,
          completedGames
        });
      }
      
      // Ordena por pontos (maior → menor)
      ranking.sort((a, b) => b.totalPoints - a.totalPoints);
      
      console.log(`🏆 TOURNAMENT: Ranking calculado:`, ranking);
      return ranking;
      
    } catch (error) {
      console.error('🏆 TOURNAMENT: Erro ao calcular ranking:', error);
      return [];
    }
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

  // Carrega histórico completo de um jogo para retomada
  async loadGameHistory(gameKey) {
    try {
      console.log(`🏆 TOURNAMENT: Carregando histórico completo do jogo ${gameKey}`);
      
      const gameData = await this.gameRepo.getGameData(gameKey);
      if (!gameData) {
        console.log(`🏆 TOURNAMENT: Jogo ${gameKey} não encontrado no Firebase`);
        return null;
      }

      // Extrai histórico de escolhas e resultados
      const history = {
        gameKey,
        choices: gameData.choices || {},
        results: gameData.results || {},
        status: gameData.status || 'active',
        currentRound: gameData.currentRound || 1,
        scores: gameData.scores || {}
      };

      // Determina qual é a próxima rodada baseado no histórico
      let nextRound = 1;
      console.log(`🏆 TOURNAMENT: Analisando resultados:`, gameData.results);
      
      if (gameData.results) {
        const completedRounds = Object.keys(gameData.results).map(r => parseInt(r)).sort((a, b) => b - a);
        console.log(`🏆 TOURNAMENT: Rodadas completas encontradas:`, completedRounds);
        
        if (completedRounds.length > 0) {
          nextRound = completedRounds[0] + 1;
          console.log(`🏆 TOURNAMENT: Última rodada completa: ${completedRounds[0]}, próxima será: ${nextRound}`);
        }
      } else {
        console.log(`🏆 TOURNAMENT: Nenhum resultado encontrado no gameData`);
      }
      
      history.nextRound = nextRound > 10 ? 10 : nextRound;

      console.log(`🏆 TOURNAMENT: Histórico processado - próxima rodada: ${history.nextRound}`);
      return history;

    } catch (error) {
      console.error(`🏆 TOURNAMENT: Erro ao carregar histórico do jogo ${gameKey}:`, error);
      return null;
    }
  }
}

export default TournamentService;