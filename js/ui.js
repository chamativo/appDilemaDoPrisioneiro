// Módulo UI - Apenas manipulação da interface
class UIModule {
    constructor() {
        this.currentPlayer = null;
        this.currentGame = null;
    }

    // Inicializar event listeners
    initialize() {
        this.setupEventListeners();
        this.showPlayerSelection();
    }

    setupEventListeners() {
        // Botões de jogador
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                window.app.selectPlayer(player);
            });
        });

        // Botões da tela inicial
        document.getElementById('ranking-btn').addEventListener('click', () => {
            window.app.showOverallRanking();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            window.app.resetTournament();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            window.app.logout();
        });

        // Botões do jogo
        document.getElementById('cooperate-btn').addEventListener('click', () => {
            window.app.makeChoice('cooperate');
        });

        document.getElementById('defect-btn').addEventListener('click', () => {
            window.app.makeChoice('defect');
        });

        document.getElementById('next-round-btn').addEventListener('click', () => {
            window.app.nextRound();
        });

        document.getElementById('back-to-games-btn').addEventListener('click', () => {
            window.app.backToGames();
        });

        // Modal
        document.getElementById('close-ranking').addEventListener('click', () => {
            this.hideRankingModal();
        });

        document.getElementById('ranking-modal').addEventListener('click', (e) => {
            if (e.target.id === 'ranking-modal') {
                this.hideRankingModal();
            }
        });
    }

    // === NAVEGAÇÃO ENTRE TELAS ===
    showPlayerSelection() {
        this.hideAllScreens();
        document.getElementById('player-selection').classList.remove('hidden');
        this.displayVersion();
    }

    showGamesScreen(playerName) {
        this.currentPlayer = playerName;
        this.hideAllScreens();
        document.getElementById('games-screen').classList.remove('hidden');
        document.getElementById('current-player').textContent = playerName;
    }

    showGameScreen(gameKey) {
        this.currentGame = gameKey;
        this.hideAllScreens();
        document.getElementById('game-screen').classList.remove('hidden');
        
        const [player1, player2] = gameKey.split('-');
        const displayText = this.currentPlayer === player1 
            ? `${player1} vs ${player2}` 
            : `${player2} vs ${player1}`;
        
        document.getElementById('game-players').innerHTML = displayText.replace(
            this.currentPlayer, 
            `<u>${this.currentPlayer}</u>`
        );
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    // === ATUALIZAÇÃO DE CONTEÚDO ===
    updateGamesLists(games) {
        this.updatePendingGames(games.pending);
        this.updateNewGames(games.available);
        this.updateCompletedGames(games.completed);
    }

    updatePendingGames(pendingGames) {
        const container = document.getElementById('pending-games');
        
        if (pendingGames.length === 0) {
            container.innerHTML = '<p>Nenhum jogo pendente.</p>';
            return;
        }

        container.innerHTML = pendingGames.map(game => `
            <div class="game-item" onclick="window.app.resumeGame('${game.gameKey}')">
                <div>
                    <div class="game-opponent">vs ${game.opponent}</div>
                    <div class="game-status">Rodada ${game.currentRound}/10</div>
                </div>
            </div>
        `).join('');
    }

    updateNewGames(availableGames) {
        const container = document.getElementById('new-games');
        
        if (availableGames.length === 0) {
            container.innerHTML = '<p>Todos os jogos já foram iniciados!</p>';
            return;
        }

        container.innerHTML = availableGames.map(game => `
            <div class="game-item" onclick="window.app.startNewGame('${game.opponent}')">
                <div>
                    <div class="game-opponent">vs ${game.opponent}</div>
                    <div class="game-status">Clique para iniciar</div>
                </div>
            </div>
        `).join('');
    }

    updateCompletedGames(completedGames) {
        const container = document.getElementById('completed-games');
        
        if (completedGames.length === 0) {
            container.innerHTML = '<p>Nenhum jogo completado ainda.</p>';
            return;
        }

        container.innerHTML = completedGames.map(game => {
            const resultIcon = game.result === 'victory' ? '✓' : 
                              game.result === 'defeat' ? '✗' : '=';
            
            return `
                <div class="game-item">
                    <div>
                        <div class="game-opponent">vs ${game.opponent}</div>
                        <div class="game-status">${game.playerScore} - ${game.opponentScore}</div>
                    </div>
                    <div class="game-result ${game.result}">${resultIcon}</div>
                </div>
            `;
        }).join('');
    }

    // === ESTADOS DO JOGO ===
    showGameState(state, data = {}) {
        this.hideAllGameStates();
        
        switch(state) {
            case 'choice':
                document.getElementById('choice-state').classList.remove('hidden');
                this.updateRoundDisplay(data.round);
                break;
                
            case 'waiting':
                document.getElementById('waiting-state').classList.remove('hidden');
                break;
                
            case 'result':
                document.getElementById('result-state').classList.remove('hidden');
                this.displayRoundResult(data.result);
                break;
                
            case 'final':
                document.getElementById('final-state').classList.remove('hidden');
                this.displayFinalResult(data.scores);
                break;
        }
    }

    hideAllGameStates() {
        document.querySelectorAll('.game-state').forEach(state => {
            state.classList.add('hidden');
        });
    }

    updateRoundDisplay(round) {
        document.getElementById('game-round').textContent = `Rodada ${round}/10`;
    }

    displayRoundResult(result) {
        const choiceText = { cooperate: 'Cooperou', defect: 'Traiu' };
        const [player1, player2] = this.currentGame.split('-');
        
        document.getElementById('result-details').innerHTML = `
            <div class="result-row">
                <span>${player1}: ${choiceText[result.player1Choice]}</span>
                <span>+${result.player1Points} pontos</span>
            </div>
            <div class="result-row">
                <span>${player2}: ${choiceText[result.player2Choice]}</span>
                <span>+${result.player2Points} pontos</span>
            </div>
        `;
    }

    displayFinalResult(scores) {
        const [player1, player2] = this.currentGame.split('-');
        
        document.getElementById('final-scores').innerHTML = `
            <div class="result-row">
                <span>${player1}</span>
                <span>${scores[player1]} pontos</span>
            </div>
            <div class="result-row">
                <span>${player2}</span>
                <span>${scores[player2]} pontos</span>
            </div>
        `;
    }

    updateRoundIndicators(results) {
        const container = document.getElementById('round-indicators');
        let html = '';
        
        for (let round = 1; round <= 10; round++) {
            const result = results.find(r => r.round === round);
            let dotClass = 'round-dot';
            
            if (result) {
                const [player1] = this.currentGame.split('-');
                const playerPoints = this.currentPlayer === player1 
                    ? result.player1Points 
                    : result.player2Points;
                dotClass += ` points-${playerPoints}`;
            }
            
            html += `<div class="${dotClass}"></div>`;
        }
        
        container.innerHTML = html;
    }

    // === MODAL E UTILITÁRIOS ===
    showRankingModal(ranking) {
        const content = document.getElementById('ranking-content');
        
        content.innerHTML = ranking.map((player, index) => `
            <div class="ranking-item">
                <span class="ranking-position">${index + 1}º</span>
                <span class="ranking-name">${player.name}</span>
                <span class="ranking-score">${player.totalPoints} pts (${player.games} jogos)</span>
            </div>
        `).join('');
        
        document.getElementById('ranking-modal').classList.remove('hidden');
    }

    hideRankingModal() {
        document.getElementById('ranking-modal').classList.add('hidden');
    }

    displayVersion() {
        const versionElement = document.getElementById('version-display');
        if (window.APP_VERSION) {
            versionElement.textContent = `${window.APP_VERSION.number} - ${window.APP_VERSION.description}`;
        }
    }

    enableChoiceButtons() {
        document.getElementById('cooperate-btn').disabled = false;
        document.getElementById('defect-btn').disabled = false;
    }

    disableChoiceButtons() {
        document.getElementById('cooperate-btn').disabled = true;
        document.getElementById('defect-btn').disabled = true;
    }
}