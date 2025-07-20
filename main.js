// Main entry point - apenas escolha de jogador, reset e classificação
import Referee from './src/app/referee.js';
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
    this.referee = new Referee();
    this.tournamentService = new TournamentService();
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
    // Seleção de jogador - passa controle para TournamentService
    eventBus.on('playerSelected', (data) => {
      logger.info('Jogador selecionado:', data.player);
      // TournamentService assume controle
    });

    // Mudança de jogador - volta para tela inicial
    eventBus.on('changePlayer', () => {
      uiRouter.navigateTo('initial');
    });

    // Reset do torneio
    eventBus.on('resetTournament', async () => {
      logger.info('Resetando torneio...');
      await this.tournamentService.resetTournament();
      alert('Torneio zerado com sucesso!');
    });

    // Mostrar ranking
    eventBus.on('showRanking', async () => {
      logger.info('Mostrando ranking...');
      const ranking = await this.tournamentService.calculateGeneralRanking();
      // TODO: Mostrar modal de ranking via uiRouter
      console.log('Ranking:', ranking);
    });

    // Erros
    eventBus.on('error', (data) => {
      logger.error('Erro na aplicação:', data);
      alert(`Erro: ${data.error.message}`);
    });
  }

}

// Inicialização global
document.addEventListener('DOMContentLoaded', async () => {
  const app = new PrisonersDilemmaApp();
  await app.initialize();
});