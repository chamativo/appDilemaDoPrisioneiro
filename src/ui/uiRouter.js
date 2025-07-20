// UI Router - navega��o e orquestra��o de carregamento de dados
class UIRouter {
  constructor() {
    this.currentScreen = null;
    this.screens = new Map();
    this.gameService = null;
    this.tournamentService = null;
  }

  // Injeta depend�ncias dos services
  setServices(gameService, tournamentService) {
    this.gameService = gameService;
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

      // Obt�m nova tela
      const screen = this.screens.get(screenName);
      if (!screen) {
        console.error(`Screen not found: ${screenName}`);
        return;
      }

      // ORQUESTRA��O: carrega dados espec�ficos para cada tela
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
      console.error('Erro na navega��o:', error);
    }
  }

  // Orquestra carregamento do dashboard
  async loadDashboardData(screen, data) {
    console.log('Carregando dados do dashboard para:', data.player);
    
    // Mostra tela primeiro
    screen.show(data);
    
    // Busca jogos do jogador
    const games = await this.getGamesByPlayer(data.player);
    console.log('Jogos encontrados:', games);
    
    // Atualiza lista de jogos
    screen.updateGamesList(games);
  }

  // Orquestra carregamento da tela de jogo
  async loadGameData(screen, data) {
    console.log('Carregando dados do jogo:', data.gameKey);
    
    // TODO: Buscar estado atual do jogo
    screen.show(data);
  }

  // Busca jogos por jogador (l�gica tempor�ria)
  async getGamesByPlayer(player) {
    try {
      const players = ['Arthur', 'Laura', 'Sergio', 'Larissa'];
      const opponents = players.filter(p => p !== player);
      
      // Por enquanto, gera jogos fict�cios
      // TODO: Implementar busca real no Firebase
      return {
        pending: [
          // Exemplo: { opponent: 'Laura', gameKey: 'Arthur-Laura', round: 3 }
        ],
        new: opponents.map(opponent => ({
          opponent,
          gameKey: this.createGameKey(player, opponent)
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

  // Utilit�rio para criar gameKey
  createGameKey(player1, player2) {
    return [player1, player2].sort().join('-');
  }

  // Obt�m tela atual
  getCurrentScreen() {
    return this.currentScreen;
  }
}

export default new UIRouter();