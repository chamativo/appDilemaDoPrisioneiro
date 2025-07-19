// Main entry point - orquestra toda a aplicação
import GameService from './src/app/gameService.js';
import TournamentService from './src/app/tournamentService.js';
import eventBus from './src/app/eventBus.js';
import uiRouter from './src/ui/uiRouter.js';
import InitialScreen from './src/ui/screens/initialScreen.js';
import DashboardScreen from './src/ui/screens/dashboardScreen.js';
import GameScreen from './src/ui/screens/gameScreen.js';
import logger from './src/util/logger.js';
import { displayVersion } from './src/util/version.js';

class PrisonersDilemmaApp {
  constructor() {
    this.gameService = new GameService();
    this.tournamentService = new TournamentService();
    this.currentPlayer = null;
    this.currentGameKey = null;
  }

  async initialize() {
    try {
      logger.info('Inicializando aplicação...');
      
      // Configuração Firebase real
      const firebaseConfig = {
        apiKey: "AIzaSyBBpLIRLhSJbKFaB9EZgSoBzi976Mf44bA",
        authDomain: "appdilemadoprisioneiro.firebaseapp.com",
        databaseURL: "https://appdilemadoprisioneiro-default-rtdb.firebaseio.com",
        projectId: "appdilemadoprisioneiro",
        storageBucket: "appdilemadoprisioneiro.firebasestorage.app",
        messagingSenderId: "35385722959",
        appId: "1:35385722959:web:c9b650c0f7f939ed57823a"
      };
      
      // Conecta serviços
      await this.gameService.connect(firebaseConfig);
      await this.tournamentService.connect(firebaseConfig);
      
      // Registra telas
      uiRouter.registerScreen('initial', new InitialScreen());
      uiRouter.registerScreen('dashboard', new DashboardScreen());
      uiRouter.registerScreen('game', new GameScreen());
      
      // Configura eventos
      this.setupEventListeners();
      
      // Mostra tela inicial
      uiRouter.navigateTo('initial');
      
      displayVersion();
      logger.info('✅ Aplicação inicializada com sucesso');
      
    } catch (error) {
      logger.error('❌ Erro na inicialização:', error);
      alert('Erro ao conectar com o servidor. Recarregue a página.');
    }
  }

  setupEventListeners() {
    // Seleção de jogador
    eventBus.on('playerSelected', (data) => {
      this.currentPlayer = data.player;
      logger.info('Jogador selecionado:', data.player);
      uiRouter.navigateTo('dashboard', { player: data.player });
    });

    // Mudança de jogador
    eventBus.on('changePlayer', () => {
      this.currentPlayer = null;
      this.currentGameKey = null;
      uiRouter.navigateTo('initial');
    });

    // Iniciar novo jogo
    eventBus.on('startNewGame', (data) => {
      logger.info('Iniciando novo jogo:', data);
      const gameKey = this.createGameKey(this.currentPlayer, data.opponent);
      this.currentGameKey = gameKey;
      
      // Configura listener do jogo
      this.gameService.setupGameListener(gameKey);
      
      uiRouter.navigateTo('game', {
        gameKey,
        currentPlayer: this.currentPlayer,
        gameState: { currentRound: 1 }
      });
    });

    // Retomar jogo
    eventBus.on('resumeGame', (data) => {
      logger.info('Retomando jogo:', data);
      this.currentGameKey = data.gameKey;
      
      // Configura listener do jogo
      this.gameService.setupGameListener(data.gameKey);
      
      uiRouter.navigateTo('game', {
        gameKey: data.gameKey,
        currentPlayer: this.currentPlayer,
        gameState: { currentRound: 1 } // Será atualizado pelo listener
      });
    });

    // Fazer escolha
    eventBus.on('makeChoice', async (data) => {
      logger.info('Fazendo escolha:', data);
      await this.gameService.submitChoice(
        data.player,
        data.gameKey,
        data.round,
        data.choice
      );
    });

    // Voltar ao dashboard
    eventBus.on('backToDashboard', () => {
      if (this.currentGameKey) {
        this.gameService.stopListening(this.currentGameKey);
        this.currentGameKey = null;
      }
      uiRouter.navigateTo('dashboard', { player: this.currentPlayer });
    });

    // Reset do torneio
    eventBus.on('resetTournament', async () => {
      logger.info('Resetando torneio...');
      await this.tournamentService.resetTournament();
      alert('Torneio zerado com sucesso!');
    });

    // Mostrar ranking
    eventBus.on('showRanking', () => {
      logger.info('Mostrando ranking...');
      // TODO: Implementar modal de ranking
    });

    // Erros
    eventBus.on('error', (data) => {
      logger.error('Erro na aplicação:', data);
      alert(`Erro: ${data.error.message}`);
    });
  }

  // Utilitário para criar gameKey
  createGameKey(player1, player2) {
    return [player1, player2].sort().join('-');
  }
}

// Inicialização global
document.addEventListener('DOMContentLoaded', async () => {
  const app = new PrisonersDilemmaApp();
  await app.initialize();
});