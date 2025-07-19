// Interface do usuário - APENAS DISPLAY PASSIVO
class GameUI {
    constructor() {
        this.currentPlayer = null;
        this.currentGame = null;
        this.lastShownResult = null;
        
        debug.log('🖥️ UI criada como display passivo');
    }

    // ==================== COMANDOS DO GAMECONTROLLER ====================
    // GameController comanda a UI através destes métodos

    commandShowChoices(round) {
        debug.log(`🖥️ COMANDO: Mostrar escolhas para rodada ${round}`);
        document.getElementById('game-round').textContent = `Rodada ${round}/10`;
        
        this.hideGameElements();
        document.querySelector('.choices').classList.remove('hidden');
        this.enableChoiceButtons();
    }

    commandShowWaiting(waitingFor) {
        debug.log(`🖥️ COMANDO: Mostrar espera - aguardando ${waitingFor}`);
        this.hideGameElements();
        document.getElementById('waiting').classList.remove('hidden');
        this.disableChoiceButtons();
    }

    commandShowProcessing() {
        debug.log(`🖥️ COMANDO: Mostrar processamento`);
        this.hideGameElements();
        document.getElementById('waiting').classList.remove('hidden');
        this.disableChoiceButtons();
    }

    commandShowRoundResult(result) {
        debug.log(`🖥️ COMANDO: Mostrar resultado da rodada ${result.round}`);
        this.lastShownResult = result;
        
        this.hideGameElements();
        document.getElementById('round-result').classList.remove('hidden');
        
        const choiceText = { cooperate: 'Cooperou', defect: 'Traiu' };
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
        
        this.updateRoundIndicators();
    }

    commandShowFinalResult(totalPoints) {
        debug.log(`🖥️ COMANDO: Mostrar resultado final do jogo`);
        
        this.hideGameElements();
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

    // ==================== MÉTODOS DE UTILIDADE ====================

    initialize() {
        this.setupEventListeners();
        this.showPlayerSelection();
        debug.log('🎯 UI inicializada');
    }

    setupEventListeners() {
        debug.log('🔗 Configurando event listeners...');
        
        // Botões de seleção de jogador
        const playerBtns = document.querySelectorAll('.player-btn');
        debug.log(`👥 Encontrados ${playerBtns.length} botões de jogador`);
        
        playerBtns.forEach((btn, index) => {
            const player = btn.dataset.player;
            debug.log(`🔘 Configurando botão ${index + 1}: ${player}`);
            
            btn.addEventListener('click', () => {
                debug.log(`🖱️ Clique detectado no jogador: ${player}`);
                this.selectPlayer(player);
            });
        });

        // Outros botões
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('cooperate-btn').addEventListener('click', () => this.makeChoice('cooperate'));
        document.getElementById('defect-btn').addEventListener('click', () => this.makeChoice('defect'));
        document.getElementById('next-round-btn').addEventListener('click', () => this.nextRound());
        document.getElementById('back-to-games').addEventListener('click', () => this.showGamesScreen());
        document.getElementById('reset-tournament-btn').addEventListener('click', () => this.resetTournament());

        // Debug buttons
        document.getElementById('debug-btn').addEventListener('click', () => this.showDebugInfo());
        document.getElementById('debug-game-btn').addEventListener('click', () => this.showGameDebugInfo());
    }

    selectPlayer(playerName) {
        debug.log(`🎮 Jogador selecionado: ${playerName}`);
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
        // GameController irá comandar a atualização da lista
        if (window.game && window.game.requestGamesList) {
            window.game.requestGamesList(this.currentPlayer);
        }
    }

    showGameScreen() {
        this.hideAllScreens();
        document.getElementById('game-screen').classList.remove('hidden');
        // GameController irá comandar a UI do jogo
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    // COMANDO: Atualizar lista de jogos (enviado pelo GameController)
    commandUpdateGamesList(pendingGames, completedGames) {
        debug.log('🖥️ COMANDO: Atualizar lista de jogos');
        this.renderPendingGames(pendingGames);
        this.renderRanking(completedGames);
    }

    renderPendingGames(pendingGames = []) {
        const container = document.getElementById('pending-games');
        
        if (pendingGames.length === 0) {
            container.innerHTML = '<p>Nenhum jogo pendente. Clique em um dos jogadores abaixo para começar!</p>';
            return;
        }
        
        container.innerHTML = pendingGames.map(game => `
            <button class="game-btn" onclick="ui.resumeGame('${game.gameKey}')">
                vs ${game.opponent}
                <br><small>Rodada ${game.currentRound}/10</small>
            </button>
        `).join('');
    }

    renderRanking(completedGames = []) {
        const container = document.getElementById('ranking');
        
        if (completedGames.length === 0) {
            container.innerHTML = '<p>Nenhum jogo completado ainda.</p>';
            return;
        }

        container.innerHTML = completedGames.map(game => `
            <div class="ranking-item">
                <span>vs ${game.opponent}</span>
                <span style="color: ${game.result === 'vitoria' ? 'green' : game.result === 'empate' ? 'blue' : 'red'}">
                    ${game.playerScore} - ${game.opponentScore} ${game.result === 'vitoria' ? '✓' : game.result === 'empate' ? '=' : '✗'}
                </span>
            </div>
        `).join('');
    }

    async startGame(opponent) {
        const players = [this.currentPlayer, opponent].sort();
        const gameKey = players.join('-');
        
        this.currentGame = {
            player1: players[0],
            player2: players[1],
            gameKey: gameKey
        };
        
        debug.log(`🎮 UI: Iniciando jogo ${gameKey}`);
        
        // Criar GameController CHEFE para este jogo
        const gameController = await window.game.getGameController(gameKey, players[0], players[1]);
        
        this.showGameScreen();
    }

    async resumeGame(gameKey) {
        debug.log(`🔄 UI: Retomando jogo ${gameKey}`);
        
        const players = gameKey.split('-');
        this.currentGame = {
            player1: players[0],
            player2: players[1], 
            gameKey: gameKey
        };
        
        // Obter GameController para este jogo
        const gameController = await window.game.getGameController(gameKey, players[0], players[1]);
        
        this.showGameScreen();
    }

    updateRoundIndicators(results = []) {
        const container = document.getElementById('round-indicators');
        let html = '';
        
        for (let round = 1; round <= 10; round++) {
            const result = results.find(r => r.round === round);
            let dotClass = 'round-dot';
            let title = `Rodada ${round}`;
            
            if (result && this.currentGame) {
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

    // Repassar escolha para o GameController (APENAS REPASSA)
    async makeChoice(choice) {
        debug.log(`🖥️ UI repassando escolha ${choice} para GameController`);
        
        if (window.game && window.game.currentGameController) {
            await window.game.currentGameController.playerMadeChoice(this.currentPlayer, choice);
        } else {
            debug.log(`❌ Nenhum GameController ativo!`);
        }
    }

    // Avançar para próxima rodada (repassar para GameController)
    nextRound() {
        debug.log('🖥️ UI: repassando nextRound para GameController');
        if (window.game && window.game.currentGameController) {
            window.game.currentGameController.updateUI();
        }
    }

    async resetTournament() {
        if (confirm('Tem certeza que deseja zerar todo o torneio? Esta ação não pode ser desfeita.')) {
            debug.log('🗑️ UI: repassando reset para aplicação principal...');
            
            if (window.game && window.game.resetTournament) {
                await window.game.resetTournament();
            } else {
                debug.log('❌ Método resetTournament não encontrado na aplicação principal');
            }
        }
    }

    showDebugInfo() {
        debug.log('🐛 Debug button clicked!');
        
        if (window.game && window.game.getDebugInfo) {
            window.game.getDebugInfo();
        } else {
            const uiDebugInfo = {
                version: typeof APP_VERSION !== 'undefined' ? APP_VERSION.number : 'unknown',
                currentPlayer: this.currentPlayer,
                currentGame: this.currentGame,
                lastShownResult: this.lastShownResult
            };
            
            const debugText = JSON.stringify(uiDebugInfo, null, 2);
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(debugText).then(() => {
                    alert('Debug info copiado para área de transferência!');
                }).catch(() => {
                    console.log('=== UI DEBUG INFO ===', uiDebugInfo);
                    alert('Erro no clipboard. Debug info no console.');
                });
            } else {
                console.log('=== UI DEBUG INFO ===', uiDebugInfo);
                alert('Clipboard não disponível. Debug info no console.');
            }
        }
    }

    showGameDebugInfo() {
        if (!this.currentGame) {
            alert('Nenhum jogo ativo para debug.');
            return;
        }
        
        if (window.game && window.game.currentGameController) {
            const debugInfo = window.game.currentGameController.getDebugInfo();
            const debugText = JSON.stringify(debugInfo, null, 2);
            
            navigator.clipboard.writeText(debugText).then(() => {
                alert('Debug info do jogo copiado para área de transferência!');
            }).catch(() => {
                console.log('=== GAME DEBUG INFO ===', debugInfo);
                alert('Debug info no console (F12 > Console).');
            });
        } else {
            alert('Nenhum GameController ativo.');
        }
    }
}