// TELA DE PARTIDA conforme especificação
import eventBus from '../../app/eventBus.js';

class GameScreen {
  constructor() {
    this.element = null;
    this.gameKey = null;
    this.currentPlayer = null;
    this.gameState = null;
  }

  // Renderiza tela de jogo
  render() {
    const [p1, p2] = this.gameKey.split('-');
    const opponent = this.currentPlayer === p1 ? p2 : p1;
    
    return `
      <div id="game-screen" class="screen">
        <div class="game-header">
          <h2>${this.currentPlayer} vs ${opponent}</h2>
          <div id="round-indicator">Rodada 1/10</div>
          <div id="round-dots" class="round-indicators"></div>
        </div>

        <!-- Estado: Escolha -->
        <div id="choice-state" class="game-state">
          <h3>Sua escolha:</h3>
          <div class="choice-buttons">
            <button id="cooperate-btn" class="choice-btn cooperate">Cooperar</button>
            <button id="defect-btn" class="choice-btn defect">Trair</button>
          </div>
        </div>

        <!-- Estado: Aguardando oponente -->
        <div id="waiting-state" class="game-state hidden">
          <div class="waiting-message">
            <p>Aguardando oponente...</p>
            <div class="spinner"></div>
          </div>
        </div>

        <!-- Estado: Resultado da rodada -->
        <div id="result-state" class="game-state hidden">
          <h3>Resultado da Rodada</h3>
          <div id="result-details"></div>
          <button id="next-round-btn" class="primary-btn">Próxima Rodada</button>
        </div>

        <!-- Estado: Resultado final -->
        <div id="final-state" class="game-state hidden">
          <h3>Resultado Final</h3>
          <div id="final-scores"></div>
          <button id="back-dashboard-btn" class="primary-btn">Voltar aos Jogos</button>
        </div>
      </div>
    `;
  }

  // Configura events
  setupEvents() {
    // Botões de escolha
    document.getElementById('cooperate-btn').addEventListener('click', () => {
      this.makeChoice('cooperate');
    });

    document.getElementById('defect-btn').addEventListener('click', () => {
      this.makeChoice('defect');
    });

    // Botão próxima rodada
    document.getElementById('next-round-btn').addEventListener('click', () => {
      this.showChoiceState();
    });

    // Botão voltar
    document.getElementById('back-dashboard-btn').addEventListener('click', () => {
      eventBus.emit('backToDashboard');
    });
  }

  // Faz escolha
  makeChoice(choice) {
    if (!this.gameState || !this.gameState.currentRound) return;

    eventBus.emit('makeChoice', {
      player: this.currentPlayer,
      gameKey: this.gameKey,
      round: this.gameState.currentRound,
      choice
    });

    this.showWaitingState();
  }

  // Estados da tela conforme especificação
  showChoiceState() {
    this.hideAllStates();
    document.getElementById('choice-state').classList.remove('hidden');
  }

  showWaitingState() {
    this.hideAllStates();
    document.getElementById('waiting-state').classList.remove('hidden');
  }

  showResultState(result) {
    this.hideAllStates();
    document.getElementById('result-state').classList.remove('hidden');
    
    const details = document.getElementById('result-details');
    details.innerHTML = `
      <div class="result-row">
        <span>${result.player1}: ${result.player1Choice}</span>
        <span>+${result.player1Points} pontos</span>
      </div>
      <div class="result-row">
        <span>${result.player2}: ${result.player2Choice}</span>
        <span>+${result.player2Points} pontos</span>
      </div>
    `;
  }

  showFinalState(scores) {
    this.hideAllStates();
    document.getElementById('final-state').classList.remove('hidden');
    
    const [p1, p2] = this.gameKey.split('-');
    const finalScores = document.getElementById('final-scores');
    finalScores.innerHTML = `
      <div class="score-row">
        <span>${p1}</span>
        <span>${scores[p1]} pontos</span>
      </div>
      <div class="score-row">
        <span>${p2}</span>
        <span>${scores[p2]} pontos</span>
      </div>
    `;
  }

  hideAllStates() {
    document.querySelectorAll('.game-state').forEach(state => {
      state.classList.add('hidden');
    });
  }

  // Atualiza indicador de rodada
  updateRoundIndicator(round) {
    document.getElementById('round-indicator').textContent = `Rodada ${round}/10`;
  }

  // Mostra tela
  show(data) {
    this.gameKey = data.gameKey;
    this.currentPlayer = data.currentPlayer;
    this.gameState = data.gameState || { currentRound: 1 };
    
    this.element = document.getElementById('app');
    this.element.innerHTML = this.render();
    this.setupEvents();
    
    this.showChoiceState();
    this.updateRoundIndicator(this.gameState.currentRound);
  }

  // Esconde tela
  hide() {
    // Cleanup
  }
}

export default GameScreen;