// Orquestrador principal - conecta todos os módulos
class PrisonersDilemmaGame {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.gameState = new GameState(this.firebaseManager);
        this.gameLogic = new GameLogic();
        this.ui = new GameUI(this.gameLogic, this.gameState);
        
        this.currentGameController = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            debug.log('⚠️ Jogo já inicializado, ignorando');
            return;
        }

        debug.log('🚀 Inicializando jogo...');
        
        await this.gameState.initialize();
        window.addEventListener('gameStateChanged', () => this.handleStateChange());
        this.ui.initialize();
        
        this.initialized = true;
        debug.log('✅ Jogo inicializado com sucesso');
    }

    // Criar/obter controlador para jogo específico
    getGameController(gameKey, player1, player2) {
        if (!this.currentGameController || this.currentGameController.gameKey !== gameKey) {
            this.currentGameController = new GameController(
                gameKey, player1, player2, this.gameState, this.gameLogic
            );
            this.currentGameController.initialize();
        }
        return this.currentGameController;
    }

    handleStateChange() {
        debug.log('🔄 Estado do jogo mudou, verificando...');
        
        if (!this.ui.currentGame || !this.ui.currentPlayer) {
            return;
        }

        // Obter controlador do jogo atual
        const gameController = this.getGameController(
            this.ui.currentGame.gameKey,
            this.ui.currentGame.player1,
            this.ui.currentGame.player2
        );

        const status = gameController.getStatus();
        debug.log(`🎯 Status: rodada ${status.currentRound}, aguardando: ${status.waitingFor}`);

        // Processar rodada se ambos jogaram
        if (status.canProcess) {
            this.handleRoundProcessing(gameController);
        }

        // Mostrar resultado se há um novo
        this.handleNewResults(gameController);

        // Atualizar UI se necessário
        this.ui.updateFromGameController(gameController);
    }

    async handleRoundProcessing(gameController) {
        const result = await gameController.processRoundIfReady(this.ui.currentPlayer);
        
        if (result.processed && result.result) {
            debug.log(`📋 Nova rodada processada: ${result.nextRound}`);
        }
    }

    handleNewResults(gameController) {
        const latestResult = gameController.getLatestResult();
        if (latestResult && (!this.lastShownResult || latestResult.round > this.lastShownResult.round)) {
            this.ui.showRoundResult(latestResult);
            this.lastShownResult = latestResult;
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