// Orquestrador principal - NOVA ARQUITETURA
class PrisonersDilemmaGame {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.gameState = new GameState(this.firebaseManager);
        this.gameLogic = new GameLogic();
        this.ui = new GameUI(); // UI agora é passiva
        
        this.currentGameController = null;
        this.initialized = false;
        
        debug.log('🎮 Aplicação criada com nova arquitetura');
    }

    async initialize() {
        if (this.initialized) {
            debug.log('⚠️ Jogo já inicializado, ignorando');
            return;
        }

        debug.log('🚀 Inicializando aplicação...');
        
        // Inicializar GameState (conecta Firebase e carrega dados)
        await this.gameState.initialize();
        
        // Configurar listener para mudanças do GameState
        window.addEventListener('gameStateChanged', (event) => {
            this.handleGameStateChange(event.detail);
        });
        
        // Inicializar UI com dependências
        this.ui.gameState = this.gameState;
        this.ui.gameLogic = this.gameLogic;
        this.ui.initialize();
        
        this.initialized = true;
        debug.log('✅ Aplicação inicializada com sucesso');
    }

    // Criar/obter controlador CHEFE para jogo específico
    async getGameController(gameKey, player1, player2) {
        if (!this.currentGameController || this.currentGameController.gameKey !== gameKey) {
            debug.log(`👑 Criando novo GameController CHEFE: ${gameKey}`);
            this.currentGameController = new GameController(
                gameKey, player1, player2, this.firebaseManager, this.gameLogic, this.ui
            );
            // Passar referência do gameState para o GameController
            this.currentGameController.gameState = this.gameState;
            await this.currentGameController.initialize();
        }
        return this.currentGameController;
    }

    // Lidar com mudanças no GameState
    handleGameStateChange(gameData) {
        debug.log(`🔄 GameState mudou: ${gameData.actions.length} actions`);
        
        // Se há um jogo ativo, atualizar o GameController
        if (this.currentGameController) {
            this.currentGameController.loadGameData().then(() => {
                this.currentGameController.reconstructGameState();
                this.currentGameController.updateUI();
            });
        }
    }

    // Solicitar lista de jogos para um jogador
    requestGamesList(player) {
        debug.log(`📋 Solicitando lista de jogos para ${player}`);
        
        const pendingOpponents = this.gameLogic.getPendingGames(player, this.gameState);
        const activeGames = this.gameLogic.getActiveGames(player, this.gameState);
        const completedGames = this.gameLogic.getPlayerGameHistory(player, this.gameState);
        
        // Preparar jogos pendentes
        const pendingGames = activeGames.map(opponent => {
            const gameKey = this.gameState.getGameKey(player, opponent);
            const gameState = this.gameState.reconstructGame(gameKey);
            return {
                gameKey,
                opponent,
                currentRound: gameState.currentRound
            };
        });
        
        // Comandar UI para atualizar
        this.ui.commandUpdateGamesList(pendingGames, completedGames);
        
        // Renderizar botões de novos jogos
        this.renderNewGameButtons(player, pendingOpponents);
    }

    // Renderizar botões para iniciar novos jogos
    renderNewGameButtons(player, pendingOpponents) {
        const container = document.getElementById('new-games');
        
        if (pendingOpponents.length === 0) {
            container.innerHTML = '<p>Todos os jogos já foram iniciados!</p>';
            return;
        }
        
        container.innerHTML = `
            <h3>Iniciar novo jogo:</h3>
            ${pendingOpponents.map(opponent => `
                <button class="game-btn" onclick="ui.startGame('${opponent}')">
                    vs ${opponent}
                </button>
            `).join('')}
        `;
    }

    // Reset completo do torneio
    async resetTournament() {
        debug.log('🗑️ Resetando torneio pela aplicação principal...');
        
        // Reset do GameState
        await this.gameState.reset();
        
        // Limpar GameController ativo
        if (this.currentGameController) {
            this.currentGameController = null;
            debug.log('🎮 GameController limpo');
        }
        
        // Limpar estado local da UI
        this.ui.currentGame = null;
        this.ui.lastShownResult = null;
        
        // Atualizar UI se houver jogador ativo
        if (this.ui.currentPlayer) {
            this.requestGamesList(this.ui.currentPlayer);
        }
        
        debug.log('✅ Reset completo da aplicação');
        alert('Torneio zerado com sucesso!');
    }

    // Debug info da aplicação
    getDebugInfo() {
        const debugInfo = {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION.number : 'unknown',
            initialized: this.initialized,
            currentPlayer: this.ui.currentPlayer,
            gameState: {
                actionsCount: this.gameState.gameData.actions.length,
                hasScores: !!this.gameState.gameData.scores,
                lastActions: this.gameState.gameData.actions.slice(-3)
            },
            gameLogic: {
                playersCount: this.gameLogic.players.length,
                players: this.gameLogic.players
            },
            currentGameController: this.currentGameController ? {
                gameKey: this.currentGameController.gameKey,
                currentRound: this.currentGameController.currentRound,
                isComplete: this.currentGameController.isComplete
            } : null
        };
        
        const debugText = JSON.stringify(debugInfo, null, 2);
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(debugText).then(() => {
                alert('Debug info copiado para área de transferência!');
            }).catch(() => {
                console.log('=== APP DEBUG INFO ===', debugInfo);
                alert('Erro no clipboard. Debug info no console.');
            });
        } else {
            console.log('=== APP DEBUG INFO ===', debugInfo);
            alert('Clipboard não disponível. Debug info no console.');
        }
    }
}

// Inicialização global
let game, ui; // Para compatibilidade com HTML

document.addEventListener('DOMContentLoaded', async () => {
    game = new PrisonersDilemmaGame();
    ui = game.ui; // Para compatibilidade com onclick do HTML
    await game.initialize();
});