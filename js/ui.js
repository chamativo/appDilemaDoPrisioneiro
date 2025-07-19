// Interface do usuário
class GameUI {
    constructor(gameLogic, gameState) {
        this.gameLogic = gameLogic;
        this.gameState = gameState;
        this.currentPlayer = null;
        this.currentGame = null;
    }

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
        debug.log(`📱 updateGamesScreen() chamado para jogador: ${this.currentPlayer}`);
        debug.log(`🔍 gameState existe: ${!!this.gameState}`);
        debug.log(`🔍 gameLogic existe: ${!!this.gameLogic}`);
        
        this.renderPendingGames();
        this.renderRanking();
    }

    renderPendingGames() {
        try {
            const container = document.getElementById('pending-games');
            
            debug.log(`🎯 Renderizando jogos para ${this.currentPlayer}`);
            debug.log(`📊 GameState existe: ${!!this.gameState}`);
            debug.log(`📊 GameState.gameData existe: ${!!this.gameState?.gameData}`);
            debug.log(`📊 GameState actions: ${this.gameState?.gameData?.actions?.length || 'UNDEFINED'}`);
            debug.log(`🎮 GameLogic players: ${this.gameLogic?.players?.length || 'UNDEFINED'}`);
            
            // Verificação defensiva
            if (!this.gameState?.gameData) {
                debug.log(`❌ GameState.gameData está undefined!`);
                container.innerHTML = '<p>Erro: dados do jogo não carregados. Tente recarregar a página.</p>';
                return;
            }

            debug.log(`🔍 Chamando getPendingGames...`);
            const pendingGames = this.gameLogic.getPendingGames(this.currentPlayer, this.gameState);
            debug.log(`✅ getPendingGames retornou: ${pendingGames.length} jogos`);
            
            debug.log(`🔍 Chamando getActiveGames...`);
            const activeGames = this.gameLogic.getActiveGames(this.currentPlayer, this.gameState);
            debug.log(`✅ getActiveGames retornou: ${activeGames.length} jogos`);
            
            debug.log(`📋 Pending games: ${pendingGames.length}, Active games: ${activeGames.length}`);
            debug.log(`🔍 Pending: [${pendingGames.join(', ')}], Active: [${activeGames.join(', ')}]`);
            
            if (pendingGames.length === 0 && activeGames.length === 0) {
                container.innerHTML = '<p>Todos os jogos foram completados!</p>';
                debug.log('❌ Nenhum jogo encontrado - mostrando mensagem padrão');
                return;
            }

            debug.log('🎨 Iniciando renderização HTML...');
            let html = '';
            
            if (activeGames.length > 0) {
                debug.log(`🔄 Renderizando ${activeGames.length} jogos ativos...`);
                html += '<h4>Jogos em Andamento:</h4>';
                html += activeGames.map(opponent => `
                    <div class="pending-game">
                        <span>vs ${opponent}</span>
                        <button class="play-btn" onclick="ui.startGame('${opponent}')">Continuar</button>
                    </div>
                `).join('');
            }
            
            if (pendingGames.length > 0) {
                debug.log(`🆕 Renderizando ${pendingGames.length} jogos pendentes...`);
                html += '<h4>Novos Jogos:</h4>';
                html += pendingGames.map(opponent => `
                    <div class="pending-game">
                        <span>vs ${opponent}</span>
                        <button class="play-btn" onclick="ui.startGame('${opponent}')">Jogar</button>
                    </div>
                `).join('');
            }
            
            debug.log(`📝 HTML gerado: ${html.length} caracteres`);
            container.innerHTML = html;
            debug.log('✅ HTML inserido no container');
            
        } catch (error) {
            debug.log(`💥 ERRO em renderPendingGames: ${error.message}`);
            console.error('Erro detalhado:', error);
            const container = document.getElementById('pending-games');
            container.innerHTML = `<p>Erro ao carregar jogos: ${error.message}</p>`;
            return;
        }
    }

    renderRanking() {
        const container = document.getElementById('ranking');
        const playerGames = this.gameLogic.getPlayerGameHistory(this.currentPlayer, this.gameState);
        
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

    startGame(opponent) {
        const gameKey = this.gameState.getGameKey(this.currentPlayer, opponent);
        
        this.currentGame = {
            player1: this.currentPlayer < opponent ? this.currentPlayer : opponent,
            player2: this.currentPlayer < opponent ? opponent : this.currentPlayer,
            gameKey: gameKey
        };
        
        debug.log(`🎮 Iniciando jogo: ${this.currentGame.player1} vs ${this.currentGame.player2}`);
        this.showGameScreen();
    }

    updateGameScreen() {
        const gameState = this.gameState.reconstructGame(this.currentGame.gameKey);
        const currentRound = gameState.currentRound;
        
        debug.log(`📱 Atualizando tela para rodada ${currentRound}`);
        
        if (currentRound > 10) {
            this.endGame();
            return;
        }
        
        // Atualizar header
        const player1Display = this.currentGame.player1 === this.currentPlayer ? 
            `<u><strong>${this.currentGame.player1}</strong></u>` : this.currentGame.player1;
        const player2Display = this.currentGame.player2 === this.currentPlayer ? 
            `<u><strong>${this.currentGame.player2}</strong></u>` : this.currentGame.player2;
            
        document.getElementById('game-players').innerHTML = `${player1Display} vs ${player2Display}`;
        document.getElementById('game-round').textContent = `Rodada ${currentRound}/10`;
        
        this.updateRoundIndicators(gameState.results);
        this.hideGameElements();
        
        // Verificar se jogador já fez escolha
        const hasChosen = this.gameState.hasPlayerChosenInRound(
            this.currentGame.gameKey, 
            currentRound, 
            this.currentPlayer
        );
        
        if (hasChosen) {
            debug.log(`${this.currentPlayer} já jogou rodada ${currentRound}, aguardando oponente`);
            document.getElementById('waiting').classList.remove('hidden');
        } else {
            debug.log(`${this.currentPlayer} ainda não jogou rodada ${currentRound}, mostrando escolhas`);
            document.querySelector('.choices').classList.remove('hidden');
            this.enableChoiceButtons();
        }
    }

    updateRoundIndicators(results) {
        const container = document.getElementById('round-indicators');
        let html = '';
        
        for (let round = 1; round <= 10; round++) {
            const result = results.find(r => r.round === round);
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
        // Se houver um gameController ativo, usar ele
        if (window.game && window.game.currentGameController) {
            const result = await window.game.currentGameController.makePlayerChoice(this.currentPlayer, choice);
            if (result.success) {
                this.disableChoiceButtons();
                debug.log(`🎯 ${this.currentPlayer} escolheu ${choice} via GameController`);
                document.querySelector('.choices').classList.add('hidden');
                document.getElementById('waiting').classList.remove('hidden');
            } else {
                debug.log(`⚠️ Escolha rejeitada: ${result.reason}`);
            }
            return;
        }

        // Fallback para método antigo (temporário)
        const gameState = this.gameState.reconstructGame(this.currentGame.gameKey);
        const currentRound = gameState.currentRound;
        
        debug.log(`🔄 Recalculando rodada: currentRound=${currentRound}`);
        
        if (this.gameState.hasPlayerChosenInRound(this.currentGame.gameKey, currentRound, this.currentPlayer)) {
            debug.log(`⚠️ ${this.currentPlayer} já jogou rodada ${currentRound}, ignorando`);
            return;
        }
        
        this.disableChoiceButtons();
        debug.log(`🎯 ${this.currentPlayer} escolheu ${choice} na rodada ${currentRound}`);
        
        await this.gameState.addAction({
            player: this.currentPlayer,
            choice: choice,
            round: currentRound,
            gameKey: this.currentGame.gameKey
        });
        
        document.querySelector('.choices').classList.add('hidden');
        document.getElementById('waiting').classList.remove('hidden');
    }

    // Atualizar UI baseado no GameController
    updateFromGameController(gameController) {
        if (!gameController || !this.currentGame) return;
        
        const status = gameController.getStatus();
        debug.log(`🔄 Atualizando UI: rodada ${status.currentRound}, completo: ${status.isComplete}`);
        debug.log(`📊 Status: player1Played=${status.player1Played}, player2Played=${status.player2Played}, waitingFor=${status.waitingFor}`);
        
        // Verificar se há novo resultado para mostrar
        const latestResult = gameController.getLatestResult();
        if (latestResult && (!window.game.lastShownResult || latestResult.round > window.game.lastShownResult.round)) {
            debug.log(`🎊 Novo resultado encontrado: rodada ${latestResult.round}`);
            this.showRoundResult(latestResult);
            window.game.lastShownResult = latestResult;
            return; // Resultado sendo mostrado, não atualizar game screen ainda
        }
        
        // Se jogo terminou
        if (status.isComplete && status.currentRound > 10) {
            debug.log('🏁 Jogo completo, finalizando...');
            this.endGame();
            return;
        }
        
        // Se ambos jogaram mas ainda não há resultado, continuar aguardando
        if (status.waitingFor === 'processing') {
            debug.log('⏳ Ambos jogaram, aguardando processamento...');
            return;
        }
        
        // Se jogador atual ainda não jogou esta rodada, mostrar escolhas
        const isCurrentPlayerTurn = (status.waitingFor === this.currentPlayer || status.waitingFor === 'both');
        if (isCurrentPlayerTurn) {
            debug.log(`🎯 Vez de ${this.currentPlayer} jogar`);
            this.updateGameScreen();
        }
    }

    showRoundResult(result) {
        document.getElementById('waiting').classList.add('hidden');
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
        
        this.updateRoundIndicators(this.gameState.reconstructGame(this.currentGame.gameKey).results);
    }

    nextRound() {
        this.updateGameScreen();
    }

    endGame() {
        const gameState = this.gameState.reconstructGame(this.currentGame.gameKey);
        const totalPoints = this.gameLogic.calculateGameScores(
            gameState.results, 
            this.currentGame.player1, 
            this.currentGame.player2
        );
        
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

    async resetTournament() {
        if (confirm('Tem certeza que deseja zerar todo o torneio? Esta ação não pode ser desfeita.')) {
            debug.log('🗑️ Iniciando reset do torneio via UI...');
            
            // Reset do estado
            await this.gameState.reset();
            
            // Limpar GameController ativo se houver
            if (window.game && window.game.currentGameController) {
                window.game.currentGameController = null;
                debug.log('🎮 GameController limpo');
            }
            
            // Limpar estado local da UI
            this.currentGame = null;
            
            // Atualizar tela
            this.updateGamesScreen();
            
            debug.log('✅ Reset completo via UI');
            alert('Torneio zerado com sucesso!');
        }
    }

    showDebugInfo() {
        debug.log('🐛 Debug button clicked!');
        
        const debugInfo = {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION.number : 'unknown',
            currentPlayer: this.currentPlayer,
            gameState: {
                initialized: !!this.gameState,
                actionsCount: this.gameState?.gameData?.actions?.length || 0,
                hasScores: !!this.gameState?.gameData?.scores,
                allActions: this.gameState?.gameData?.actions || []
            },
            gameLogic: {
                initialized: !!this.gameLogic,
                playersCount: this.gameLogic?.players?.length || 0,
                players: this.gameLogic?.players || []
            },
            lastActions: this.gameState?.gameData?.actions?.slice(-5) || []
        };
        
        const debugText = JSON.stringify(debugInfo, null, 2);
        
        // Tentar copiar para clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(debugText).then(() => {
                alert('Debug info copiado para área de transferência! Cole aqui no chat.');
            }).catch(() => {
                console.log('=== DEBUG INFO ===', debugInfo);
                alert('Erro no clipboard. Debug info no console (F12 > Console).');
            });
        } else {
            // Fallback para navegadores sem clipboard API
            console.log('=== DEBUG INFO ===', debugInfo);
            alert('Clipboard não disponível. Debug info no console (F12 > Console).');
        }
    }

    showGameDebugInfo() {
        if (!this.currentGame) return;
        
        const gameState = this.gameState.reconstructGame(this.currentGame.gameKey);
        const choices = this.gameState.getRoundChoices(this.currentGame.gameKey, gameState.currentRound);
        
        const debugInfo = {
            currentPlayer: this.currentPlayer,
            currentRound: gameState.currentRound,
            roundChoices: choices,
            gameKey: this.currentGame.gameKey,
            lastActions: this.gameState.gameData.actions.slice(-5)
        };
        
        const debugText = JSON.stringify(debugInfo, null, 2);
        navigator.clipboard.writeText(debugText).then(() => {
            alert('Debug info copiado para área de transferência!');
        }).catch(() => {
            console.log('=== DEBUG INFO ===');
            console.log(debugText);
            alert('Debug info no console (F12 > Console).');
        });
    }
}