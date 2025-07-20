// Main entry point - orquestra toda a aplicação COM PLAYER + REFEREE
import Referee from './src/app/referee.js';
import TournamentService from './src/app/tournamentService.js';
import { Player } from './src/domain/player.js';
import eventBus from './src/app/eventBus.js';
import uiRouter from './src/ui/uiRouter.js';
import InitialScreen from './src/ui/screens/initialScreen.js';
import DashboardScreen from './src/ui/screens/dashboardScreen.js';
import GameScreen from './src/ui/screens/gameScreen.js';
import logger from './src/util/logger.js';
import { displayVersion } from './src/util/version.js';

class PrisonersDilemmaApp {
  constructor() {
    this.referee = new Referee();
    this.tournamentService = new TournamentService();
    this.currentPlayer = null; // Instância de Player
    this.players = new Map(); // Cache de Players
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
      await this.referee.connect(firebaseConfig);
      await this.tournamentService.connect(firebaseConfig);
      
      // Injeta services no uiRouter
      uiRouter.setServices(this.referee, this.tournamentService);
      
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
    // Seleção de jogador - cria instância Player
    eventBus.on('playerSelected', (data) => {
      const playerName = data.player;
      
      // Cria ou recupera Player
      if (!this.players.has(playerName)) {
        this.players.set(playerName, new Player(playerName));
      }
      
      this.currentPlayer = this.players.get(playerName);
      logger.info('Jogador selecionado:', playerName);
      uiRouter.navigateTo('dashboard', { player: this.currentPlayer });
    });

    // Mudança de jogador
    eventBus.on('changePlayer', () => {
      if (this.currentPlayer) {
        this.currentPlayer.backToDashboard();
      }
      this.currentPlayer = null;
      uiRouter.navigateTo('initial');
    });

    // Iniciar novo jogo via Player
    eventBus.on('startNewGame', (data) => {
      logger.info('Iniciando novo jogo:', data);
      
      if (!this.currentPlayer) {
        logger.error('Nenhum player ativo');
        return;
      }
      
      try {
        const gameKey = this.currentPlayer.startNewGame(data.opponent);
        logger.info('Jogo iniciado:', gameKey);
      } catch (error) {
        logger.error('Erro ao iniciar jogo:', error);
        alert(`Erro: ${error.message}`);
      }
    });

    // Retomar jogo via Player
    eventBus.on('resumeGame', (data) => {
      logger.info('Retomando jogo:', data);
      
      if (!this.currentPlayer) {
        logger.error('Nenhum player ativo');
        return;
      }
      
      try {
        const gameKey = this.currentPlayer.resumeGame(data.gameKey, data.round || 1);
        logger.info('Jogo retomado:', gameKey);
      } catch (error) {
        logger.error('Erro ao retomar jogo:', error);
        alert(`Erro: ${error.message}`);
      }
    });

    // Fazer escolha via Player
    eventBus.on('makeChoice', async (data) => {
      logger.info('Fazendo escolha:', data);
      
      if (!this.currentPlayer) {
        logger.error('Nenhum player ativo');
        return;
      }
      
      try {
        this.currentPlayer.makeChoice(data.choice);
      } catch (error) {
        logger.error('Erro ao fazer escolha:', error);
        alert(`Erro: ${error.message}`);
      }
    });

    // Voltar ao dashboard via Player
    eventBus.on('backToDashboard', () => {
      if (this.currentPlayer) {
        this.currentPlayer.backToDashboard();
      }
    });

    // Reset do torneio
    eventBus.on('resetTournament', async () => {
      logger.info('Resetando torneio...');
      await this.tournamentService.resetTournament();
      alert('Torneio zerado com sucesso!');
    });

    // ============ EVENTOS DO REFEREE ============
    
    // Referee iniciou jogo
    eventBus.on('refereeGameStarted', (data) => {
      logger.info('Referee iniciou jogo:', data);
      uiRouter.navigateTo('game', {
        gameKey: data.gameKey,
        currentPlayer: this.currentPlayer,
        gameState: { currentRound: data.round }
      });
    });

    // Referee retomou jogo
    eventBus.on('refereeGameResumed', (data) => {
      logger.info('Referee retomou jogo:', data);
      uiRouter.navigateTo('game', {
        gameKey: data.gameKey,
        currentPlayer: this.currentPlayer,
        gameState: { currentRound: data.round }
      });
    });

    // Referee quer mostrar resultado
    eventBus.on('refereeShowResult', (data) => {
      logger.info('Referee mostra resultado:', data);
      uiRouter.getCurrentScreen()?.showResultState(data.result);
    });

    // Referee iniciou nova rodada
    eventBus.on('refereeRoundStarted', (data) => {
      logger.info('Referee iniciou rodada:', data);
      if (this.currentPlayer) {
        this.currentPlayer.updateGameState(data.gameKey, data.round);
      }
      uiRouter.getCurrentScreen()?.showChoiceState();
      uiRouter.getCurrentScreen()?.updateRoundIndicator(data.round);
    });

    // Referee finalizou jogo
    eventBus.on('refereeGameComplete', (data) => {
      logger.info('Referee finalizou jogo:', data);
      if (this.currentPlayer) {
        this.currentPlayer.finishGame(data.gameKey);
      }
      uiRouter.getCurrentScreen()?.showFinalState({});
    });

    // Player voltou ao dashboard
    eventBus.on('playerBackToDashboard', (data) => {
      logger.info('Player voltou ao dashboard:', data);
      uiRouter.navigateTo('dashboard', { player: this.currentPlayer });
    });

    // Avançar para próxima rodada via Player
    eventBus.on('advanceToNextRound', (data) => {
      logger.info('Avançando para próxima rodada:', data);
      
      if (this.currentPlayer) {
        this.currentPlayer.continueToNextRound();
      }
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