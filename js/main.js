// Orquestrador principal - conecta todos os módulos
class PrisonersDilemmaGame {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.gameState = new GameState(this.firebaseManager);
        this.gameLogic = new GameLogic();
        this.ui = new GameUI(this.gameLogic, this.gameState);
        
        this.processingRound = false;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            debug.log('⚠️ Jogo já inicializado, ignorando');
            return;
        }

        debug.log('🚀 Inicializando jogo...');
        
        // Inicializar estado
        await this.gameState.initialize();
        
        // Configurar listener para mudanças de estado
        window.addEventListener('gameStateChanged', () => {
            this.handleStateChange();
        });
        
        // Inicializar UI
        this.ui.initialize();
        
        this.initialized = true;
        debug.log('✅ Jogo inicializado com sucesso');
    }

    handleStateChange() {
        debug.log('🔄 Estado do jogo mudou, verificando...');
        
        // Se não estiver em um jogo, não precisa processar
        if (!this.ui.currentGame || !this.ui.currentPlayer) {
            return;
        }

        const gameState = this.gameState.reconstructGame(this.ui.currentGame.gameKey);
        const currentRound = gameState.currentRound;

        // Se jogo terminou
        if (currentRound > 10 && !gameState.gameComplete) {
            this.endGameIfNeeded();
            return;
        }

        // Verificar se precisa processar rodada
        if (this.gameLogic.canProcessRound(this.ui.currentGame.gameKey, currentRound, this.gameState)) {
            this.processRoundIfNeeded(currentRound);
        }

        // Verificar se precisa mostrar resultado
        this.checkForNewResults(gameState);
    }

    async processRoundIfNeeded(round) {
        if (this.processingRound) {
            debug.log('⏳ Já processando rodada, aguardando...');
            return;
        }

        // Verificar se resultado já foi processado
        if (this.gameLogic.isRoundProcessed(this.ui.currentGame.gameKey, round, this.gameState)) {
            debug.log(`✅ Rodada ${round} já processada`);
            return;
        }

        this.processingRound = true;
        debug.log(`⚡ Processando rodada ${round}...`);

        try {
            const choices = this.gameState.getRoundChoices(this.ui.currentGame.gameKey, round);
            const [player1, player2] = this.ui.currentGame.gameKey.split('-');
            
            const result = this.gameLogic.processRound(
                this.ui.currentGame.gameKey,
                round,
                player1,
                player2,
                choices[player1],
                choices[player2]
            );

            // Apenas o player1 (ordem alfabética) salva o resultado para evitar duplicação
            if (this.ui.currentPlayer === player1) {
                debug.log(`📝 ${player1} salvando resultado da rodada ${round}`);
                await this.gameState.addAction({
                    type: 'roundResult',
                    gameKey: this.ui.currentGame.gameKey,
                    round: round,
                    result: result
                });
            }

        } finally {
            setTimeout(() => {
                this.processingRound = false;
            }, 500);
        }
    }

    checkForNewResults(gameState) {
        // Verificar se há novos resultados para mostrar
        const latestResult = gameState.results[gameState.results.length - 1];
        
        if (latestResult && !this.lastShownResult) {
            this.ui.showRoundResult(latestResult);
            this.lastShownResult = latestResult;
        } else if (latestResult && this.lastShownResult && 
                   latestResult.round > this.lastShownResult.round) {
            this.ui.showRoundResult(latestResult);
            this.lastShownResult = latestResult;
        }
    }

    async endGameIfNeeded() {
        // Verificar se resultado final já foi salvo
        const gameCompleteExists = this.gameState.gameData.actions.some(a => 
            a.type === 'gameComplete' && 
            a.gameKey === this.ui.currentGame.gameKey
        );

        if (gameCompleteExists) {
            debug.log('🏁 Jogo já marcado como completo');
            this.ui.endGame();
            return;
        }

        const gameState = this.gameState.reconstructGame(this.ui.currentGame.gameKey);
        const totalPoints = this.gameLogic.calculateGameScores(
            gameState.results,
            this.ui.currentGame.player1,
            this.ui.currentGame.player2
        );

        // Apenas o player1 salva o gameComplete
        if (this.ui.currentPlayer === this.ui.currentGame.player1) {
            debug.log(`🏁 ${this.ui.currentPlayer} marcando jogo como completo`);
            await this.gameState.addAction({
                type: 'gameComplete',
                gameKey: this.ui.currentGame.gameKey,
                scores: totalPoints
            });
        }

        this.ui.endGame();
    }
}

// Inicialização global
let game, ui; // Para compatibilidade com HTML

document.addEventListener('DOMContentLoaded', async () => {
    game = new PrisonersDilemmaGame();
    ui = game.ui; // Para compatibilidade com onclick do HTML
    await game.initialize();
});