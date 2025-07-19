// Aplicação sem ES6 modules - versão funcional
console.log('Carregando aplicação...');

// EventBus simples
const eventBus = {
  listeners: new Map(),
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  },
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event ${event}:`, error);
      }
    });
  }
};

// Função de pontuação pura
function scoreChoices(c1, c2) {
  if (c1 === 'cooperate' && c2 === 'cooperate') return [3, 3];
  if (c1 === 'cooperate' && c2 === 'defect') return [0, 5];
  if (c1 === 'defect' && c2 === 'cooperate') return [5, 0];
  return [1, 1];
}

// Firebase adapter
class FirebaseAdapter {
  constructor() {
    this.db = null;
  }

  async connect() {
    const firebaseConfig = {
      apiKey: "AIzaSyBBpLIRLhSJbKFaB9EZgSoBzi976Mf44bA",
      authDomain: "appdilemadoprisioneiro.firebaseapp.com",
      databaseURL: "https://appdilemadoprisioneiro-default-rtdb.firebaseio.com",
      projectId: "appdilemadoprisioneiro",
      storageBucket: "appdilemadoprisioneiro.firebasestorage.app",
      messagingSenderId: "35385722959",
      appId: "1:35385722959:web:c9b650c0f7f939ed57823a"
    };
    
    firebase.initializeApp(firebaseConfig);
    this.db = firebase.database();
    console.log('✅ Firebase conectado');
  }

  async saveChoice(gameKey, player, choice, round) {
    const choiceData = {
      type: 'choice',
      player,
      choice,
      round,
      gameKey,
      timestamp: Date.now()
    };
    
    await this.db.ref(`games/${gameKey}/choices/${round}/${player}`).set(choiceData);
  }

  async saveRoundResult(gameKey, round, result) {
    const resultData = {
      type: 'roundResult',
      gameKey,
      round,
      result,
      timestamp: Date.now()
    };
    
    await this.db.ref(`games/${gameKey}/results/${round}`).set(resultData);
  }

  listenToGame(gameKey, callback) {
    const ref = this.db.ref(`games/${gameKey}`);
    ref.on('value', callback);
  }
}

// UI Router simples
const uiRouter = {
  currentScreen: null,
  
  navigateTo(screenName, data = {}) {
    console.log('Navegando para:', screenName, data);
    
    if (screenName === 'initial') {
      this.showInitialScreen();
    } else if (screenName === 'dashboard') {
      this.showDashboard(data);
    } else if (screenName === 'game') {
      this.showGameScreen(data);
    }
  },

  showInitialScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="screen">
        <h1>Dilema do Prisioneiro</h1>
        
        <div class="player-buttons">
          <button class="player-btn" onclick="selectPlayer('Arthur')">Arthur</button>
          <button class="player-btn" onclick="selectPlayer('Laura')">Laura</button>
          <button class="player-btn" onclick="selectPlayer('Sergio')">Sergio</button>
          <button class="player-btn" onclick="selectPlayer('Larissa')">Larissa</button>
        </div>
        
        <div class="action-buttons">
          <button class="secondary-btn" onclick="showRanking()">Classificação Geral</button>
          <button class="reset-btn" onclick="resetTournament()">Zerar Torneio</button>
        </div>
        
        <div class="version">v2024.013</div>
      </div>
    `;
  },

  showDashboard(data) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <h2>${data.player}</h2>
          <button class="secondary-btn" onclick="changePlayer()">Trocar jogador</button>
        </div>
        
        <div class="games-section">
          <h3>Jogos Pendentes</h3>
          <div id="pending-games" class="games-list">
            <p>Nenhum jogo pendente.</p>
          </div>
        </div>
        
        <div class="games-section">
          <h3>Novos Jogos</h3>
          <div id="new-games" class="games-list">
            ${this.generateNewGamesList(data.player)}
          </div>
        </div>
        
        <div class="games-section">
          <h3>Histórico</h3>
          <div id="completed-games" class="games-list">
            <p>Nenhum jogo completado ainda.</p>
          </div>
        </div>
      </div>
    `;
  },

  generateNewGamesList(currentPlayer) {
    const players = ['Arthur', 'Laura', 'Sergio', 'Larissa'];
    const opponents = players.filter(p => p !== currentPlayer);
    
    return opponents.map(opponent => `
      <div class="game-item" onclick="startNewGame('${opponent}')">
        <span>vs ${opponent}</span>
        <span>Clique para iniciar</span>
      </div>
    `).join('');
  },

  showGameScreen(data) {
    const [p1, p2] = data.gameKey.split('-');
    const opponent = data.currentPlayer === p1 ? p2 : p1;
    
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="screen">
        <div class="game-header">
          <h2>${data.currentPlayer} vs ${opponent}</h2>
          <div id="round-indicator">Rodada 1/10</div>
        </div>

        <div id="choice-state" class="game-state">
          <h3>Sua escolha:</h3>
          <div class="choice-buttons">
            <button class="choice-btn cooperate" onclick="makeChoice('cooperate')">Cooperar</button>
            <button class="choice-btn defect" onclick="makeChoice('defect')">Trair</button>
          </div>
        </div>

        <div id="waiting-state" class="game-state hidden">
          <div class="waiting-message">
            <p>Aguardando oponente...</p>
            <div class="spinner"></div>
          </div>
        </div>

        <button class="secondary-btn" onclick="backToDashboard()" style="margin-top: 20px;">Voltar</button>
      </div>
    `;
  }
};

// Estado global da aplicação
const appState = {
  currentPlayer: null,
  currentGameKey: null,
  firebase: new FirebaseAdapter()
};

// Funções globais para eventos
function selectPlayer(player) {
  console.log('Jogador selecionado:', player);
  appState.currentPlayer = player;
  uiRouter.navigateTo('dashboard', { player });
}

function changePlayer() {
  appState.currentPlayer = null;
  appState.currentGameKey = null;
  uiRouter.navigateTo('initial');
}

function startNewGame(opponent) {
  console.log('Iniciando jogo contra:', opponent);
  const gameKey = [appState.currentPlayer, opponent].sort().join('-');
  appState.currentGameKey = gameKey;
  
  uiRouter.navigateTo('game', {
    gameKey,
    currentPlayer: appState.currentPlayer
  });
}

function makeChoice(choice) {
  console.log('Escolha feita:', choice);
  
  // Mostrar estado de espera
  document.getElementById('choice-state').classList.add('hidden');
  document.getElementById('waiting-state').classList.remove('hidden');
  
  // Salvar escolha no Firebase
  if (appState.firebase.db) {
    appState.firebase.saveChoice(appState.currentGameKey, appState.currentPlayer, choice, 1)
      .then(() => {
        console.log('Escolha salva no Firebase');
      })
      .catch(error => {
        console.error('Erro ao salvar escolha:', error);
      });
  }
}

function backToDashboard() {
  uiRouter.navigateTo('dashboard', { player: appState.currentPlayer });
}

function showRanking() {
  alert('Ranking ainda não implementado');
}

function resetTournament() {
  if (confirm('Tem certeza que deseja zerar todo o torneio?')) {
    alert('Reset ainda não implementado');
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM carregado, inicializando aplicação...');
  
  try {
    await appState.firebase.connect();
    uiRouter.navigateTo('initial');
    console.log('✅ Aplicação inicializada');
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    alert('Erro ao conectar. Recarregue a página.');
  }
});