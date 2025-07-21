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
      eventBus.emit('advanceToNextRound', {
        player: this.currentPlayer?.getName(),
        gameKey: this.gameKey
      });
    });

    // Botão voltar
    document.getElementById('back-dashboard-btn').addEventListener('click', () => {
      eventBus.emit('backToDashboard');
    });
  }

  // Faz escolha
  makeChoice(choice) {
    if (!this.gameKey || !this.currentPlayer) return;

    const playerName = this.currentPlayer.getName();
    console.log('📺 UI: Fazendo escolha', { player: playerName, gameKey: this.gameKey, choice });

    // Referee que determina a rodada atual, não o GameScreen
    eventBus.emit('makeChoice', {
      player: playerName,
      gameKey: this.gameKey,
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

  showResultState(result, round) {
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

    // Atualiza bolinha usando a rodada que vem do ÁRBITRO
    if (this.currentPlayer && round) {
      const playerName = this.currentPlayer.getName();
      const [p1, p2] = this.gameKey.split('-');
      const playerPoints = playerName === p1 ? result.player1Points : result.player2Points;
      
      console.log(`🎯 GameScreen: Atualizando bolinha rodada ${round} (do Árbitro) com ${playerPoints} pontos`);
      this.updateRoundDotWithPoints(round, playerPoints);
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
    
    // Se container vazio, cria todas as bolinhas
    if (container.children.length === 0) {
      let html = '';
      for (let round = 1; round <= 10; round++) {
        let dotClass = 'round-dot';
        if (round === currentRound) {
          dotClass += ' current';
        }
        html += `<div class="${dotClass}" data-round="${round}"></div>`;
      }
      container.innerHTML = html;
      return;
    }
    
    // Se já existem bolinhas, apenas atualiza a classe 'current'
    for (let round = 1; round <= 10; round++) {
      const dot = container.querySelector(`[data-round="${round}"]`);
      if (dot) {
        // Remove 'current' de todas
        dot.classList.remove('current');
        
        // Adiciona 'current' apenas na rodada atual
        if (round === currentRound) {
          dot.classList.add('current');
        }
      }
    }
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
    this.gameState = data.gameState || { currentRound: data.currentRound || 1 };
    
    this.element = document.getElementById('app');
    this.element.innerHTML = this.render();
    this.setupEvents();
    
    this.showChoiceState();
    this.updateRoundIndicator(this.gameState.currentRound);
    
    // Se há histórico, reconstrói as bolinhas DEPOIS de criar os elementos
    if (data.gameHistory) {
      this.reconstructRoundDots(data.gameHistory);
    }
  }

  // Reconstrói bolinhas das rodadas baseado no histórico
  reconstructRoundDots(gameHistory) {
    if (!gameHistory || !gameHistory.results) return;
    
    console.log('🎯 GameScreen: Reconstruindo bolinhas baseado no histórico', gameHistory);
    
    const playerName = this.currentPlayer.getName();
    const [p1, p2] = this.gameKey.split('-');
    let results = gameHistory.results;
    
    // Se results é array, processa cada índice
    if (Array.isArray(results)) {
      console.log('🎯 GameScreen: Results é array, processando índices');
      results.forEach((result, index) => {
        if (result && index > 0) { // Pula índice 0 vazio
          const round = index; // Rodada = índice do array
          
          console.log(`🎯 GameScreen: Dados do resultado da rodada ${round}:`, result);
          
          // Verifica diferentes estruturas possíveis dos dados
          let playerPoints;
          
          if (result.result) {
            // Se result tem propriedade result (estrutura aninhada)
            console.log(`🎯 GameScreen: Estrutura result.result completa:`, result.result);
            
            // Tenta diferentes propriedades possíveis
            if (result.result.player1 && result.result.player2) {
              playerPoints = playerName === result.result.player1 ? result.result.player1Points : result.result.player2Points;
            } else if (result.result.player1Choice && result.result.player2Choice) {
              // Talvez sejam player1Choice/player2Choice
              const isPlayer1 = playerName === 'Arthur'; // Assume Arthur é sempre player1
              playerPoints = isPlayer1 ? result.result.player1Points : result.result.player2Points;
            } else {
              console.log(`🎯 GameScreen: Propriedades encontradas em result.result:`, Object.keys(result.result));
              // Fallback: assume order baseado no gameKey
              const [p1, p2] = this.gameKey.split('-');
              playerPoints = playerName === p1 ? result.result.player1Points : result.result.player2Points;
            }
            console.log(`🎯 GameScreen: Player ${playerName} identificado com ${playerPoints} pontos`);
          } else if (result.player1Points !== undefined) {
            // Se result tem as propriedades diretas
            playerPoints = playerName === result.player1 ? result.player1Points : result.player2Points;
            console.log(`🎯 GameScreen: Usando propriedades diretas - player1: ${result.player1}, player2: ${result.player2}`);
          } else {
            console.log(`🎯 GameScreen: Estrutura desconhecida:`, result);
            playerPoints = 0; // fallback
          }
          
          console.log(`🎯 GameScreen: Player ${playerName} - pontos: ${playerPoints}`);
          this.updateRoundDotWithPoints(round, playerPoints);
        }
      });
    } else {
      // Se é object, usa as chaves
      Object.keys(results).forEach(roundStr => {
        const round = parseInt(roundStr);
        const result = results[roundStr];
        
        // Determina pontos do jogador atual
        const playerPoints = playerName === result.player1 ? result.player1Points : result.player2Points;
        
        console.log(`🎯 GameScreen: Reconstruindo bolinha rodada ${round} com ${playerPoints} pontos`);
        this.updateRoundDotWithPoints(round, playerPoints);
      });
    }
  }

  // Esconde tela
  hide() {
    // Cleanup
  }
}

export default GameScreen;