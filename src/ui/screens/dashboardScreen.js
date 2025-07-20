// DASHBOARD DO JOGADOR conforme especificação
import eventBus from '../../app/eventBus.js';
import uiRouter from '../uiRouter.js';

class DashboardScreen {
  constructor() {
    this.element = null;
    this.currentPlayerName = null;
  }

  // Renderiza dashboard
  render() {
    const playerName = this.currentPlayerName || 'Nenhum';
    return `
      <div id="dashboard-screen" class="screen">
        <div class="header">
          <h2 id="current-player">${playerName}</h2>
          <button id="change-player-btn" class="secondary-btn">Trocar jogador</button>
        </div>
        
        <div class="games-section">
          <h3>Jogos Pendentes</h3>
          <div id="pending-games" class="games-list">
            <!-- Será preenchido dinamicamente -->
          </div>
        </div>
        
        <div class="games-section">
          <h3>Novos Jogos</h3>
          <div id="new-games" class="games-list">
            <!-- Será preenchido dinamicamente -->
          </div>
        </div>
        
        <div class="games-section">
          <h3>Histórico</h3>
          <div id="completed-games" class="games-list">
            <!-- Será preenchido dinamicamente -->
          </div>
        </div>
      </div>
    `;
  }

  // Configura events
  setupEvents() {
    document.getElementById('change-player-btn').addEventListener('click', () => {
      eventBus.emit('changePlayer');
    });
  }

  // Atualiza lista de jogos
  updateGamesList(games) {
    this.updatePendingGames(games.pending || []);
    this.updateNewGames(games.new || []);
    this.updateCompletedGames(games.completed || []);
  }

  updatePendingGames(games) {
    const container = document.getElementById('pending-games');
    if (games.length === 0) {
      container.innerHTML = '<p>Nenhum jogo pendente.</p>';
      return;
    }

    container.innerHTML = games.map(game => `
      <div class="game-item" data-game-key="${game.gameKey}">
        <span>vs ${game.opponent}</span>
        <span>Rodada ${game.round}/10</span>
      </div>
    `).join('');

    // Event listeners para jogos pendentes
    container.querySelectorAll('.game-item').forEach(item => {
      item.addEventListener('click', () => {
        const gameKey = item.dataset.gameKey;
        eventBus.emit('resumeGame', { gameKey });
      });
    });
  }

  updateNewGames(games) {
    const container = document.getElementById('new-games');
    if (games.length === 0) {
      container.innerHTML = '<p>Todos os jogos já foram iniciados!</p>';
      return;
    }

    container.innerHTML = games.map(game => `
      <div class="game-item" data-opponent="${game.opponent}">
        <span>vs ${game.opponent}</span>
        <span>Clique para iniciar</span>
      </div>
    `).join('');

    // Event listeners para novos jogos
    container.querySelectorAll('.game-item').forEach(item => {
      item.addEventListener('click', () => {
        const opponent = item.dataset.opponent;
        eventBus.emit('startNewGame', { opponent });
      });
    });
  }

  updateCompletedGames(games) {
    const container = document.getElementById('completed-games');
    if (games.length === 0) {
      container.innerHTML = '<p>Nenhum jogo completado ainda.</p>';
      return;
    }

    container.innerHTML = games.map(game => {
      const resultIcon = game.result === 'victory' ? '✓' : 
                        game.result === 'defeat' ? '✗' : '=';
      
      return `
        <div class="game-item">
          <span>vs ${game.opponent}</span>
          <span>${game.playerScore}-${game.opponentScore} ${resultIcon}</span>
        </div>
      `;
    }).join('');
  }

  // Mostra tela
  show(data) {
    this.currentPlayerName = data.player;
    this.element = document.getElementById('app');
    this.element.innerHTML = this.render();
    this.setupEvents();
  }

  // Esconde tela
  hide() {
    // Cleanup se necessário
  }
}

export default DashboardScreen;