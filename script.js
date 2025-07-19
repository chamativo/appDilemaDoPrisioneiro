// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBBpLIRLhSJbKFaB9EZgSoBzi976Mf44bA",
    authDomain: "appdilemadoprisioneiro.firebaseapp.com",
    databaseURL: "https://appdilemadoprisioneiro-default-rtdb.firebaseio.com",
    projectId: "appdilemadoprisioneiro",
    storageBucket: "appdilemadoprisioneiro.firebasestorage.app",
    messagingSenderId: "35385722959",
    appId: "1:35385722959:web:c9b650c0f7f939ed57823a"
};

class PrisonersDilemmaGame {
    constructor() {
        this.players = ['Arthur', 'Laura', 'Sergio', 'Larissa'];
        this.currentPlayer = null;
        this.currentGame = null;
        this.currentRound = 1;
        this.choices = {};
        this.gameResults = [];
        this.gameData = {
            scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
            actions: []
        };
        
        this.debugLog('🚀 Constructor iniciado');
        this.initFirebase();
    }

    debugLog(message) {
        console.log(`[DEBUG] ${new Date().toLocaleTimeString()}: ${message}`);
        
        // Também mostrar na tela se estivermos na tela de seleção
        const debugDiv = document.getElementById('debug-console') || this.createDebugConsole();
        debugDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }

    createDebugConsole() {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-console';
        debugDiv.style.cssText = `
            position: fixed; 
            bottom: 10px; 
            right: 10px; 
            width: 300px; 
            height: 200px; 
            background: rgba(0,0,0,0.8); 
            color: white; 
            padding: 10px; 
            font-size: 10px; 
            overflow-y: auto; 
            z-index: 1000;
            border-radius: 5px;
        `;
        document.body.appendChild(debugDiv);
        return debugDiv;
    }

    async initFirebase() {
        this.debugLog('🔥 Iniciando Firebase...');
        
        try {
            await this.connectFirebase();
        } catch (error) {
            this.debugLog(`❌ Erro Firebase: ${error.message}`);
            this.debugLog('🔄 Fallback para localStorage');
            this.gameData = this.loadGameData();
            this.initStorageListener();
            this.init();
        }
    }

    async connectFirebase() {
        this.debugLog('🔗 Conectando ao Firebase...');
        firebase.initializeApp(firebaseConfig);
        this.db = firebase.database();
        this.debugLog('✅ Firebase inicializado');
        
        // Verificar se já foi inicializado para evitar dupla inicialização
        if (this.initialized) {
            this.debugLog('⚠️ Jogo já inicializado, pulando init()');
            return;
        }
        
        this.db.ref('gameData').on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.gameData = snapshot.val();
                this.handleDataUpdate();
            }
        });
        
        this.debugLog('📡 Carregando dados do Firebase...');
        const snapshot = await this.db.ref('gameData').once('value');
        if (!snapshot.exists()) {
            this.debugLog('📝 Criando dados iniciais no Firebase...');
            await this.db.ref('gameData').set({
                scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
                actions: []
            });
        }
        
        this.debugLog('🎮 Inicializando jogo com Firebase');
        this.init();
    }
    
    initStorageListener() {
        // Storage events (funciona entre abas diferentes)
        window.addEventListener('storage', (e) => {
            if (e.key === 'prisonersDilemmaData') {
                this.gameData = JSON.parse(e.newValue);
                this.handleDataUpdate();
            }
        });
        
        // Evento customizado (funciona na mesma aba)
        window.addEventListener('gameDataChanged', (e) => {
            this.gameData = e.detail;
            this.handleDataUpdate();
        });
        
        // Polling como backup final
        setInterval(() => {
            const newData = this.loadGameData();
            if (JSON.stringify(newData) !== JSON.stringify(this.gameData)) {
                this.gameData = newData;
                this.handleDataUpdate();
            }
        }, 300);
    }

    init() {
        if (this.initialized) {
            this.debugLog('⚠️ init() já foi chamado, ignorando');
            return;
        }
        
        this.debugLog('🎯 Inicializando jogo...');
        this.initEventListeners();
        this.showPlayerSelection();
        this.initialized = true;
        this.debugLog('✅ Jogo inicializado');
    }

    initEventListeners() {
        this.debugLog('🔗 Configurando event listeners...');
        
        const playerBtns = document.querySelectorAll('.player-btn');
        this.debugLog(`👥 Encontrados ${playerBtns.length} botões de jogador`);
        
        playerBtns.forEach((btn, index) => {
            const player = btn.dataset.player;
            this.debugLog(`🔘 Configurando botão ${index + 1}: ${player}`);
            
            btn.addEventListener('click', (e) => {
                this.debugLog(`🖱️ Clique detectado no jogador: ${player}`);
                this.selectPlayer(player);
            });
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('cooperate-btn').addEventListener('click', () => {
            this.makeChoice('cooperate');
        });

        document.getElementById('defect-btn').addEventListener('click', () => {
            this.makeChoice('defect');
        });

        document.getElementById('next-round-btn').addEventListener('click', () => {
            this.nextRound();
        });

        document.getElementById('back-to-games').addEventListener('click', () => {
            this.showGamesScreen();
        });

        document.getElementById('debug-btn').addEventListener('click', () => {
            alert(JSON.stringify({
                currentPlayer: this.currentPlayer,
                currentRound: this.currentRound,
                choices: this.choices,
                gameKey: this.currentGame?.gameKey,
                actions: this.gameData.actions.slice(-10)
            }, null, 2));
        });

        document.getElementById('reset-tournament-btn').addEventListener('click', () => {
            this.resetTournament();
        });

        document.getElementById('debug-game-btn').addEventListener('click', () => {
            const roundChoices = this.getRoundChoices(this.currentGame?.gameKey, this.currentRound);
            const debugInfo = {
                currentPlayer: this.currentPlayer,
                currentRound: this.currentRound,
                myChoices: this.choices,
                roundChoices: roundChoices,
                gameKey: this.currentGame?.gameKey,
                processingRound: this.processingRound,
                lastActions: this.gameData.actions.slice(-5)
            };
            
            const debugText = JSON.stringify(debugInfo, null, 2);
            
            // Copiar para área de transferência
            navigator.clipboard.writeText(debugText).then(() => {
                alert('Debug info copiado para área de transferência! Cole aqui no chat.');
            }).catch(() => {
                // Fallback se clipboard não funcionar
                console.log('=== DEBUG INFO ===');
                console.log(debugText);
                console.log('==================');
                alert('Debug info no console (F12 > Console). Clipboard não funcionou.');
            });
        });
    }

    handleDataUpdate() {
        if (!this.currentPlayer) return;
        
        if (this.currentGame) {
            const gameState = this.reconstructGameState(this.currentGame.gameKey);
            
            if (document.getElementById('game-screen').classList.contains('hidden')) {
                return;
            }
            
            if (gameState.gameComplete && this.currentRound <= 10) {
                this.currentRound = 11;
                this.endGame();
                return;
            }
            
            if (gameState.results.length !== this.gameResults.length) {
                const oldLength = this.gameResults.length;
                
                this.gameResults = [...gameState.results];
                this.currentRound = gameState.currentRound;
                
                console.log(`handleDataUpdate: newRound=${this.currentRound}, oldResults=${oldLength}, newResults=${gameState.results.length}`);
                
                // Só mostrar resultado se for um resultado novo
                if (gameState.results.length > oldLength) {
                    const lastResult = gameState.results[gameState.results.length - 1];
                    console.log(`Novo resultado da rodada ${lastResult.round}, mostrando resultado`);
                    this.showRoundResult(lastResult);
                }
            }
            
            // Verificar se ambos jogaram e processar rodada
            const roundChoices = this.getRoundChoices(this.currentGame.gameKey, this.currentRound);
            const opponent = this.currentGame.player1 === this.currentPlayer ? 
                this.currentGame.player2 : this.currentGame.player1;
            
            this.debugLog(`🎯 Verificando rodada ${this.currentRound}: ${this.currentPlayer}=${roundChoices[this.currentPlayer] || 'nada'}, ${opponent}=${roundChoices[opponent] || 'nada'}`);
            
            if (roundChoices[this.currentPlayer] && roundChoices[opponent] && !this.processingRound) {
                this.debugLog(`✅ Ambos jogaram! Processando rodada ${this.currentRound}`);
                this.choices[opponent] = roundChoices[opponent];
                this.processingRound = true;
                setTimeout(() => {
                    this.processRound();
                    this.processingRound = false;
                }, 100);
            } else {
                this.debugLog(`⏳ Aguardando jogadas para rodada ${this.currentRound}`);
            }
        }
        
        if (document.getElementById('games-screen').classList.contains('hidden') === false) {
            this.updateGamesScreen();
        }
    }

    loadGameData() {
        const saved = localStorage.getItem('prisonersDilemmaData');
        if (saved) {
            const data = JSON.parse(saved);
            // Garantir que actions existe mesmo em dados antigos
            if (!data.actions) {
                data.actions = [];
            }
            return data;
        }

        return {
            scores: {
                Arthur: 0,
                Laura: 0,
                Sergio: 0,
                Larissa: 0
            },
            completedGames: [],
            actions: []
        };
    }

    async saveGameData() {
        try {
            if (this.db) {
                // Salvar no Firebase para sincronização entre dispositivos
                await this.db.ref('gameData').set(this.gameData);
                console.log('Dados salvos no Firebase');
            } else {
                // Fallback para localStorage
                localStorage.setItem('prisonersDilemmaData', JSON.stringify(this.gameData));
                console.log('Dados salvos no localStorage (fallback)');
                
                // Disparar evento customizado para sincronização imediata
                window.dispatchEvent(new CustomEvent('gameDataChanged', { 
                    detail: this.gameData 
                }));
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            // Fallback para localStorage em caso de erro
            localStorage.setItem('prisonersDilemmaData', JSON.stringify(this.gameData));
        }
    }

    selectPlayer(playerName) {
        this.debugLog(`🎮 Jogador selecionado: ${playerName}`);
        this.currentPlayer = playerName;
        document.getElementById('current-player-name').textContent = playerName;
        this.showGamesScreen();
    }

    logout() {
        this.currentPlayer = null;
        this.showPlayerSelection();
    }

    showPlayerSelection() {
        this.hideAllScreens();
        document.getElementById('player-selection').classList.remove('hidden');
    }

    showGamesScreen() {
        this.hideAllScreens();
        document.getElementById('games-screen').classList.remove('hidden');
        this.updateGamesScreen();
    }

    showGameScreen() {
        this.hideAllScreens();
        document.getElementById('game-screen').classList.remove('hidden');
        this.updateGameScreen();
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    updateGamesScreen() {
        this.renderPendingGames();
        this.renderRanking();
    }

    renderPendingGames() {
        const container = document.getElementById('pending-games');
        const pendingGames = this.getPendingGames();
        const activeGames = this.getActiveGames();
        
        console.log('Debug - Current player:', this.currentPlayer);
        console.log('Debug - Pending games:', pendingGames);
        console.log('Debug - Active games:', activeGames);
        console.log('Debug - All actions:', this.gameData.actions);
        
        if (pendingGames.length === 0 && activeGames.length === 0) {
            container.innerHTML = '<p>Todos os jogos foram completados!</p>';
            return;
        }

        let html = '';
        
        if (activeGames.length > 0) {
            html += '<h4>Jogos em Andamento:</h4>';
            html += activeGames.map(opponent => `
                <div class="pending-game">
                    <span>vs ${opponent}</span>
                    <button class="play-btn" onclick="game.startGame('${opponent}')">Continuar</button>
                </div>
            `).join('');
        }
        
        if (pendingGames.length > 0) {
            html += '<h4>Novos Jogos:</h4>';
            html += pendingGames.map(opponent => `
                <div class="pending-game">
                    <span>vs ${opponent}</span>
                    <button class="play-btn" onclick="game.startGame('${opponent}')">Jogar</button>
                </div>
            `).join('');
        }
        
        container.innerHTML = html;
    }

    getPendingGames() {
        const allOpponents = this.players.filter(p => p !== this.currentPlayer);
        return allOpponents.filter(opponent => {
            const gameKey = this.getGameKey(this.currentPlayer, opponent);
            const hasAnyAction = this.gameData.actions.some(a => a.gameKey === gameKey);
            return !hasAnyAction;
        });
    }

    getActiveGames() {
        const allOpponents = this.players.filter(p => p !== this.currentPlayer);
        return allOpponents.filter(opponent => {
            const gameKey = this.getGameKey(this.currentPlayer, opponent);
            return this.isGameActive(gameKey);
        });
    }

    isGameActive(gameKey) {
        const gameActions = this.gameData.actions.filter(a => a.gameKey === gameKey);
        const hasCompletedAction = this.gameData.actions.some(a => 
            a.gameKey === gameKey && a.type === 'gameComplete'
        );
        return gameActions.length > 0 && !hasCompletedAction;
    }

    getGameKey(player1, player2) {
        return [player1, player2].sort().join('-');
    }

    renderRanking() {
        const container = document.getElementById('ranking');
        
        // Mostrar jogos do jogador atual
        const playerGames = this.getPlayerGames(this.currentPlayer);
        
        if (playerGames.length === 0) {
            container.innerHTML = '<p>Nenhum jogo completado ainda.</p>';
            return;
        }

        container.innerHTML = playerGames.map(game => `
            <div class="ranking-item">
                <span>vs ${game.opponent}</span>
                <span style="color: ${game.result === 'vitoria' ? 'green' : game.result === 'empate' ? 'blue' : 'red'}">
                    ${game.playerScore} - ${game.opponentScore} ${game.result === 'vitoria' ? '✓' : game.result === 'empate' ? '=' : '✗'}
                </span>
            </div>
        `).join('');
    }

    getPlayerGames(player) {
        const completedGames = this.gameData.actions
            .filter(a => a.type === 'gameComplete')
            .map(action => {
                const [player1, player2] = action.gameKey.split('-');
                const opponent = player1 === player ? player2 : player1;
                const playerScore = action.scores[player] || 0;
                const opponentScore = action.scores[opponent] || 0;
                
                let result = 'empate';
                if (playerScore > opponentScore) result = 'vitoria';
                else if (playerScore < opponentScore) result = 'derrota';
                
                return {
                    opponent,
                    playerScore,
                    opponentScore,
                    result
                };
            })
            .filter(game => game.opponent); // Filtrar jogos válidos
        
        return completedGames;
    }

    startGame(opponent) {
        const gameKey = this.getGameKey(this.currentPlayer, opponent);
        
        this.currentGame = {
            player1: this.currentPlayer < opponent ? this.currentPlayer : opponent,
            player2: this.currentPlayer < opponent ? opponent : this.currentPlayer,
            gameKey: gameKey
        };
        
        const gameState = this.reconstructGameState(gameKey);
        this.currentRound = gameState.currentRound;
        this.gameResults = gameState.results;
        this.choices = {}; // Sempre começar com choices limpo
        
        console.log(`Iniciando jogo: ${this.currentGame.player1} vs ${this.currentGame.player2}, rodada ${this.currentRound}`);
        
        this.showGameScreen();
    }

    updateGameScreen() {
        console.log(`updateGameScreen: Atualizando para rodada ${this.currentRound}`);
        
        // Se o jogo já terminou, mostrar resultado final
        if (this.currentRound > 10) {
            this.endGame();
            return;
        }
        
        const player1Display = this.currentGame.player1 === this.currentPlayer ? 
            `<u><strong>${this.currentGame.player1}</strong></u>` : this.currentGame.player1;
        const player2Display = this.currentGame.player2 === this.currentPlayer ? 
            `<u><strong>${this.currentGame.player2}</strong></u>` : this.currentGame.player2;
            
        document.getElementById('game-players').innerHTML = 
            `${player1Display} vs ${player2Display}`;
        document.getElementById('game-round').textContent = 
            `Rodada ${this.currentRound}/10`;
        
        // Atualizar indicadores de rodada
        this.updateRoundIndicators();
        
        this.hideGameElements();
        
        const roundChoices = this.getRoundChoices(this.currentGame.gameKey, this.currentRound);
        console.log(`updateGameScreen: roundChoices para rodada ${this.currentRound}:`, roundChoices);
        
        if (roundChoices[this.currentPlayer]) {
            console.log(`${this.currentPlayer} já jogou rodada ${this.currentRound}, aguardando oponente`);
            document.getElementById('waiting').classList.remove('hidden');
        } else {
            console.log(`${this.currentPlayer} ainda não jogou rodada ${this.currentRound}, mostrando escolhas`);
            document.querySelector('.choices').classList.remove('hidden');
            this.enableChoiceButtons();
        }
    }

    updateRoundIndicators() {
        const container = document.getElementById('round-indicators');
        const gameState = this.reconstructGameState(this.currentGame.gameKey);
        
        // Criar 10 bolinhas (uma para cada rodada)
        let html = '';
        for (let round = 1; round <= 10; round++) {
            const result = gameState.results.find(r => r.round === round);
            let dotClass = 'round-dot';
            let title = `Rodada ${round}`;
            
            if (result) {
                const isPlayer1 = this.currentGame.player1 === this.currentPlayer;
                const playerPoints = isPlayer1 ? result.player1Points : result.player2Points;
                
                dotClass += ` points-${playerPoints}`;
                title += ` - ${playerPoints} pontos`;
            }
            
            html += `<div class="${dotClass}" title="${title}"></div>`;
        }
        
        container.innerHTML = html;
    }

    hideGameElements() {
        document.getElementById('waiting').classList.add('hidden');
        document.getElementById('round-result').classList.add('hidden');
        document.getElementById('game-result').classList.add('hidden');
    }

    enableChoiceButtons() {
        document.getElementById('cooperate-btn').disabled = false;
        document.getElementById('defect-btn').disabled = false;
    }

    disableChoiceButtons() {
        document.getElementById('cooperate-btn').disabled = true;
        document.getElementById('defect-btn').disabled = true;
    }

    async makeChoice(choice) {
        this.choices[this.currentPlayer] = choice;
        this.disableChoiceButtons();
        
        console.log(`${this.currentPlayer} escolheu ${choice} na rodada ${this.currentRound}`);
        
        await this.addAction({
            player: this.currentPlayer,
            choice: choice,
            round: this.currentRound,
            gameKey: this.currentGame.gameKey,
            timestamp: Date.now()
        });
        
        document.querySelector('.choices').classList.add('hidden');
        document.getElementById('waiting').classList.remove('hidden');
    }

    async processRound() {
        const player1Choice = this.choices[this.currentGame.player1];
        const player2Choice = this.choices[this.currentGame.player2];
        
        if (!player1Choice || !player2Choice) {
            console.log('Choices not ready yet', this.choices);
            return;
        }
        
        const points = this.calculatePoints(player1Choice, player2Choice);
        
        const roundResult = {
            round: this.currentRound,
            player1Choice,
            player2Choice,
            player1Points: points.player1,
            player2Points: points.player2
        };
        
        // Apenas o player1 (em ordem alfabética) salva o roundResult para evitar duplicação
        const existingResult = this.gameData.actions.find(a => 
            a.type === 'roundResult' && 
            a.gameKey === this.currentGame.gameKey && 
            a.round === this.currentRound
        );
        
        if (!existingResult && this.currentPlayer === this.currentGame.player1) {
            await this.addAction({
                type: 'roundResult',
                gameKey: this.currentGame.gameKey,
                round: this.currentRound,
                result: roundResult,
                timestamp: Date.now()
            });
        }
        
        this.gameResults.push(roundResult);
        
        this.showRoundResult(roundResult);
        
        // Se foi a última rodada (10), verificar se todos os 10 rounds foram completados
        if (this.currentRound === 10) {
            const gameState = this.reconstructGameState(this.currentGame.gameKey);
            if (gameState.results.length === 10) {
                setTimeout(() => {
                    this.endGame();
                }, 2000); // Dar um tempo para o usuário ver o resultado
            }
        }
    }

    calculatePoints(choice1, choice2) {
        if (choice1 === 'cooperate' && choice2 === 'cooperate') {
            return { player1: 3, player2: 3 };
        } else if (choice1 === 'cooperate' && choice2 === 'defect') {
            return { player1: 0, player2: 5 };
        } else if (choice1 === 'defect' && choice2 === 'cooperate') {
            return { player1: 5, player2: 0 };
        } else {
            return { player1: 1, player2: 1 };
        }
    }

    showRoundResult(result) {
        document.getElementById('waiting').classList.add('hidden');
        document.getElementById('round-result').classList.remove('hidden');
        
        const choiceText = {
            cooperate: 'Cooperou',
            defect: 'Traiu'
        };
        
        document.getElementById('result-details').innerHTML = `
            <div class="result-row">
                <span>${this.currentGame.player1}: ${choiceText[result.player1Choice]}</span>
                <span>+${result.player1Points} pontos</span>
            </div>
            <div class="result-row">
                <span>${this.currentGame.player2}: ${choiceText[result.player2Choice]}</span>
                <span>+${result.player2Points} pontos</span>
            </div>
        `;
        
        // Atualizar indicadores após mostrar resultado
        this.updateRoundIndicators();
    }

    nextRound() {
        this.choices = {}; // Limpar escolhas da rodada anterior
        
        // Reconstruir state para obter a rodada correta
        const gameState = this.reconstructGameState(this.currentGame.gameKey);
        this.currentRound = gameState.currentRound;
        
        console.log(`Avançando para rodada ${this.currentRound}`);
        
        if (this.currentRound > 10) {
            this.endGame();
        } else {
            this.updateGameScreen();
        }
    }

    async endGame() {
        // Recalcular pontos baseado nos actions salvos (fonte da verdade)
        const roundResults = this.gameData.actions
            .filter(a => a.type === 'roundResult' && a.gameKey === this.currentGame.gameKey)
            .sort((a, b) => a.round - b.round);
        
        const totalPoints = roundResults.reduce((acc, action) => {
            acc[this.currentGame.player1] += action.result.player1Points;
            acc[this.currentGame.player2] += action.result.player2Points;
            return acc;
        }, { [this.currentGame.player1]: 0, [this.currentGame.player2]: 0 });
        
        // Verificar se o jogo já foi marcado como completo
        const existingComplete = this.gameData.actions.find(a => 
            a.type === 'gameComplete' && 
            a.gameKey === this.currentGame.gameKey
        );
        
        // Apenas o player1 (em ordem alfabética) salva o gameComplete para evitar duplicação
        if (!existingComplete && this.currentPlayer === this.currentGame.player1) {
            await this.addAction({
                type: 'gameComplete',
                gameKey: this.currentGame.gameKey,
                scores: totalPoints,
                timestamp: Date.now()
            });
        }
        
        this.showGameResult(totalPoints);
    }

    showGameResult(totalPoints) {
        document.getElementById('round-result').classList.add('hidden');
        document.getElementById('game-result').classList.remove('hidden');
        
        document.getElementById('final-scores').innerHTML = `
            <div class="result-row">
                <span>${this.currentGame.player1}</span>
                <span>${totalPoints[this.currentGame.player1]} pontos</span>
            </div>
            <div class="result-row">
                <span>${this.currentGame.player2}</span>
                <span>${totalPoints[this.currentGame.player2]} pontos</span>
            </div>
        `;
    }

    async addAction(action) {
        this.gameData.actions.push(action);
        await this.saveGameData();
    }

    getRoundChoices(gameKey, round) {
        const choices = {};
        const roundActions = this.gameData.actions
            .filter(a => a.gameKey === gameKey && a.round === round && a.choice)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        this.debugLog(`🔍 getRoundChoices para ${gameKey} rodada ${round}: encontrados ${roundActions.length} actions`);
        roundActions.forEach((action, index) => {
            this.debugLog(`   Action ${index + 1}: ${action.player} = ${action.choice}`);
            choices[action.player] = action.choice;
        });
        
        return choices;
    }

    reconstructGameState(gameKey) {
        const gameActions = this.gameData.actions
            .filter(a => a.gameKey === gameKey)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        const results = [];
        let currentRound = 1;
        let gameComplete = false;
        const totalScores = { [this.currentGame.player1]: 0, [this.currentGame.player2]: 0 };
        
        gameActions.forEach(action => {
            if (action.type === 'roundResult') {
                results.push(action.result);
                totalScores[this.currentGame.player1] += action.result.player1Points;
                totalScores[this.currentGame.player2] += action.result.player2Points;
                // A próxima rodada é simplesmente o número de resultados + 1
                currentRound = results.length + 1;
            } else if (action.type === 'gameComplete') {
                gameComplete = true;
            }
        });
        
        return {
            currentRound: gameComplete ? 11 : currentRound,
            results: results,
            totalScores: totalScores,
            gameComplete: gameComplete
        };
    }

    resetTournament() {
        if (confirm('Tem certeza que deseja zerar todo o torneio? Esta ação não pode ser desfeita.')) {
            this.gameData = {
                scores: {
                    Arthur: 0,
                    Laura: 0,
                    Sergio: 0,
                    Larissa: 0
                },
                actions: []
            };
            this.saveGameData();
            this.updateGamesScreen();
            alert('Torneio zerado com sucesso!');
        }
    }
}

const game = new PrisonersDilemmaGame();