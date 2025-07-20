// UI Router - navegação e orquestração de carregamento de dados
import eventBus from '../app/eventBus.js';

class UIRouter {
  constructor() {
    this.currentScreen = null;
    this.screens = new Map();
    this.referee = null;
    this.tournamentService = null;
    this.currentGameKey = null;
    
    // Escuta eventos de atualização do jogo
    this.setupEventListeners();
  }

  // Configura listeners de eventos - APENAS COMANDOS DIRETOS
  setupEventListeners() {
    // Comandos específicos do árbitro (referee)
    eventBus.on('refereeShowResult', (data) => {
      console.log('📺 uiRouter: Referee mandou mostrar resultado da rodada', data.round);
      this.executeShowResult(data);
    });
    
    eventBus.on('startNextRound', (data) => {
      console.log('📺 uiRouter: Starting next round');
      this.executeNextRound(data);
    });
    
    eventBus.on('showGameComplete', (data) => {
      console.log('📺 uiRouter: Game complete');
      this.executeGameComplete(data);
    });
  }

  // Injeta dependências dos services
  setServices(referee, tournamentService) {
    this.referee = referee;
    this.tournamentService = tournamentService;
  }

  // Registra uma tela
  registerScreen(name, screenInstance) {
    this.screens.set(name, screenInstance);
  }

  // Navega para uma tela - ORQUESTRA carregamento de dados
  async navigateTo(screenName, data = {}) {
    try {
      // Esconde tela atual
      if (this.currentScreen) {
        this.currentScreen.hide();
      }

      // Obtém nova tela
      const screen = this.screens.get(screenName);
      if (!screen) {
        console.error(`Screen not found: ${screenName}`);
        return;
      }

      // ORQUESTRAÇÃO: carrega dados específicos para cada tela
      if (screenName === 'dashboard') {
        await this.loadDashboardData(screen, data);
      } else if (screenName === 'game') {
        await this.loadGameData(screen, data);
      } else {
        // Telas simples sem dados
        screen.show(data);
      }

      this.currentScreen = screen;
    } catch (error) {
      console.error('Erro na navegação:', error);
    }
  }

  // Orquestra carregamento do dashboard
  async loadDashboardData(screen, data) {
    console.log('Carregando dados do dashboard para:', data.player);
    
    // Mostra tela primeiro
    screen.show(data);
    
    // Busca jogos do jogador (agora recebe instância Player)
    const games = await this.getGamesByPlayer(data.player);
    console.log('Jogos encontrados:', games);
    
    // Atualiza lista de jogos
    screen.updateGamesList(games);
  }

  // Orquestra carregamento da tela de jogo
  async loadGameData(screen, data) {
    console.log('Carregando dados do jogo:', data.gameKey);
    this.currentGameKey = data.gameKey;
    
    // TODO: Buscar estado atual do jogo
    screen.show(data);
  }

  // COMANDOS EXECUTADOS - NÃO DECIDE, APENAS EXECUTA
  executeShowResult(data) {
    const gameScreen = this.screens.get('game');
    if (this.currentScreen === gameScreen && data.gameKey === this.currentGameKey) {
      gameScreen.showResultState(data.result, data.round); // Passa rodada do Referee
    }
  }
  
  executeNextRound(data) {
    const gameScreen = this.screens.get('game');
    if (this.currentScreen === gameScreen && data.gameKey === this.currentGameKey) {
      gameScreen.showChoiceState();
      gameScreen.updateRoundIndicator(data.round);
    }
  }
  
  executeGameComplete(data) {
    const gameScreen = this.screens.get('game');
    if (this.currentScreen === gameScreen && data.gameKey === this.currentGameKey) {
      gameScreen.showFinalState(data.scores);
    }
  }

  // Busca jogos por jogador usando instância Player
  async getGamesByPlayer(playerInstance) {
    try {
      if (!playerInstance || !playerInstance.getOpponents) {
        console.error('Player inválido:', playerInstance);
        return { pending: [], new: [], completed: [] };
      }
      
      const opponents = playerInstance.getOpponents();
      const playerName = playerInstance.getName();
      
      // Por enquanto, gera jogos fictícios
      // TODO: Implementar busca real no Firebase
      return {
        pending: [
          // Exemplo: { opponent: 'Laura', gameKey: 'Arthur-Laura', round: 3 }
        ],
        new: opponents.map(opponent => ({
          opponent,
          gameKey: this.createGameKey(playerName, opponent)
        })),
        completed: [
          // Exemplo: { opponent: 'Sergio', playerScore: 25, opponentScore: 18, result: 'victory' }
        ]
      };
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
      return { pending: [], new: [], completed: [] };
    }
  }

  // Utilitário para criar gameKey
  createGameKey(player1, player2) {
    return [player1, player2].sort().join('-');
  }

  // Obtém tela atual
  getCurrentScreen() {
    return this.currentScreen;
  }
}

export default new UIRouter();