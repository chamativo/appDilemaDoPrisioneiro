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

    // Comandos do TournamentService
    eventBus.on('tournamentNavigateToDashboard', (data) => {
      console.log('📺 uiRouter: TournamentService mandou navegar para dashboard');
      this.navigateTo('dashboard', data);
    });

    eventBus.on('tournamentDashboardReady', (data) => {
      console.log('📺 uiRouter: TournamentService forneceu dados do dashboard');
      this.executeDashboardUpdate(data);
    });

    // Comandos do Referee para navegação
    eventBus.on('refereeGameStarted', (data) => {
      console.log('📺 uiRouter: Referee mandou navegar para jogo');
      this.navigateTo('game', {
        gameKey: data.gameKey,
        currentPlayer: data.currentPlayer,
        currentRound: data.round
      });
    });

    eventBus.on('refereeGameResumed', (data) => {
      console.log('📺 uiRouter: Referee mandou navegar para jogo retomado');
      this.navigateTo('game', {
        gameKey: data.gameKey,
        currentPlayer: data.currentPlayer,
        currentRound: data.round,
        gameHistory: data.gameHistory // Passa histórico para UI
      });
    });

    eventBus.on('refereeRoundStarted', (data) => {
      console.log('📺 uiRouter: Referee iniciou rodada', data.round);
      this.executeNextRound(data);
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

  // Navega para uma tela - APENAS EXECUTA
  async navigateTo(screenName, data = {}) {
    try {
      console.log(`📺 uiRouter: Navegando para ${screenName}`);
      
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

      // Simplesmente mostra a tela com os dados fornecidos
      screen.show(data);
      this.currentScreen = screen;
      
      if (screenName === 'game') {
        this.currentGameKey = data.gameKey;
      }
      
    } catch (error) {
      console.error('Erro na navegação:', error);
    }
  }

  // Executa atualização do dashboard com dados do TournamentService  
  executeDashboardUpdate(data) {
    const dashboardScreen = this.screens.get('dashboard');
    if (this.currentScreen === dashboardScreen) {
      console.log('📺 uiRouter: Atualizando dashboard com dados do Tournament');
      dashboardScreen.updateGamesList({
        active: data.active,
        new: data.new,
        completed: data.completed
      });
    }
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


  // Obtém tela atual
  getCurrentScreen() {
    return this.currentScreen;
  }
}

export default new UIRouter();