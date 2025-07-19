// TELA INICIAL conforme especificação
import eventBus from '../../app/eventBus.js';
import uiRouter from '../uiRouter.js';

class InitialScreen {
  constructor() {
    this.element = null;
  }

  // Renderiza tela inicial
  render() {
    return `
      <div id="initial-screen" class="screen">
        <h1>Dilema do Prisioneiro</h1>
        
        <div class="player-buttons">
          <button class="player-btn" data-player="Arthur">Arthur</button>
          <button class="player-btn" data-player="Laura">Laura</button>
          <button class="player-btn" data-player="Sergio">Sergio</button>
          <button class="player-btn" data-player="Larissa">Larissa</button>
        </div>
        
        <div class="action-buttons">
          <button id="ranking-btn" class="secondary-btn">Classificação Geral</button>
          <button id="reset-btn" class="reset-btn">Zerar Torneio</button>
        </div>
        
        <div class="version" id="version-display">v2024.013</div>
      </div>
    `;
  }

  // Configura event listeners
  setupEvents() {
    // Botões de jogador
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const player = e.target.dataset.player;
        eventBus.emit('playerSelected', { player });
      });
    });

    // Botão ranking
    document.getElementById('ranking-btn').addEventListener('click', () => {
      eventBus.emit('showRanking');
    });

    // Botão reset
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Tem certeza que deseja zerar todo o torneio?')) {
        eventBus.emit('resetTournament');
      }
    });
  }

  // Mostra tela
  show() {
    this.element = document.getElementById('app');
    this.element.innerHTML = this.render();
    this.setupEvents();
  }

  // Esconde tela
  hide() {
    // Remove event listeners se necessário
  }
}

export default InitialScreen;