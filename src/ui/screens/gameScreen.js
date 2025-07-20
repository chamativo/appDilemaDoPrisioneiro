// TELA DE PARTIDA conforme especificação
import eventBus from '../../app/eventBus.js';
import { translateChoice } from '../../util/translations.js';

class GameScreen {
  constructor() {
    this.element = null;
    this.gameKey = null;
    this.currentPlayer = null;
    this.gameState = null;
  }

  // Renderiza tela de jogo
  render() {
    const playerName = this.currentPlayer?.getName() || 'Player';
    const opponent = this.currentPlayer?.getOpponentName(this.gameKey) || 'Opponent';
    
    return `
      <div id="game-screen" class="screen">
        <div class="game-header">
          <h2>${playerName} vs ${opponent}</h2>
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

    // Botão próxima rodada - chama máquina de estados
    document.getElementById('next-round-btn').addEventListener('click', () => {
      const currentRound = this.currentPlayer?.getCurrentRound() || 1;
      eventBus.emit('advanceToNextRound', {
        gameKey: this.gameKey,
        currentRound: currentRound // CORRETO: pega do Player
      });
    });

    // Botão voltar
    document.getElementById('back-dashboard-btn').addEventListener('click', () => {
      eventBus.emit('backToDashboard');
    });
  }

  // Faz escolha
  makeChoice(choice) {
    if (!this.currentPlayer) return;

    const playerName = this.currentPlayer.getName();
    const currentRound = this.currentPlayer.getCurrentRound(); // CORRETO: pega do Player
    
    console.log('📺 UI: Fazendo escolha', { player: playerName, round: currentRound, choice });

    eventBus.emit('makeChoice', {
      player: playerName,
      gameKey: this.gameKey,
      round: currentRound,
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
        <span>${result.player1}: ${translateChoice(result.player1Choice)}</span>
        <span>+${result.player1Points} pontos</span>
      </div>
      <div class="result-row">
        <span>${result.player2}: ${translateChoice(result.player2Choice)}</span>
        <span>+${result.player2Points} pontos</span>
      </div>
    `;

    // Atualiza bolinha da rodada atual com pontos do jogador
    if (this.currentPlayer) {
      const playerName = this.currentPlayer.getName();
      const currentRound = this.currentPlayer.getCurrentRound(); // CORRETO: pega do Player
      const [p1, p2] = this.gameKey.split('-');
      const playerPoints = playerName === p1 ? result.player1Points : result.player2Points;
      
      this.updateRoundDotWithPoints(currentRound, playerPoints);
    }
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
    this.updateRoundDots(round);
  }

  // Atualiza bolinhas das rodadas com feedback visual
  updateRoundDots(currentRound = 1) {
    const container = document.getElementById('round-dots');
    let html = '';
    
    for (let round = 1; round <= 10; round++) {
      let dotClass = 'round-dot';
      
      if (round === currentRound) {
        dotClass += ' current';
      }
      // Não marca como "completed" aqui - deixa isso para quando os pontos forem definidos
      
      html += `<div class="${dotClass}" data-round="${round}"></div>`;
    }
    
    container.innerHTML = html;
  }

  // Atualiza bolinha específica com pontos ganhos
  updateRoundDotWithPoints(round, playerPoints) {
    const container = document.getElementById('round-dots');
    const dot = container.querySelector(`[data-round="${round}"]`);
    if (dot) {
      dot.className = `round-dot points-${playerPoints}`;
      console.log(`🎯 GameScreen: Atualizou bolinha rodada ${round} com ${playerPoints} pontos`);
    } else {
      console.error(`🎯 GameScreen: Bolinha da rodada ${round} não encontrada`);
    }
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