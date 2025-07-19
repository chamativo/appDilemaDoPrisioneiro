// Aplicação Principal - Coordenação entre módulos
class PrisonersDilemmaApp {
    constructor() {
        this.firebase = new FirebaseModule();
        this.game = new GameModule();
        this.ui = new UIModule();
        
        this.gameData = null;
        this.currentPlayer = null;
        this.currentGameKey = null;
    }

    async initialize() {
        try {
            // Conectar Firebase
            await this.firebase.connect();
            
            // Carregar dados iniciais
            this.gameData = await this.firebase.loadData();
            
            // Configurar listener para mudanças
            this.firebase.onDataChange((data) => {
                this.gameData = data;
                this.handleDataChange();
            });
            
            // Inicializar UI
            this.ui.initialize();
            
            console.log('✅ Aplicação inicializada');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            alert('Erro ao conectar com o servidor. Recarregue a página.');
        }
    }

    // === EVENTOS DA UI ===
    selectPlayer(playerName) {
        this.currentPlayer = playerName;
        this.ui.showGamesScreen(playerName);
        this.updateGamesLists();
    }

    logout() {
        this.currentPlayer = null;
        this.currentGameKey = null;
        this.ui.showPlayerSelection();
    }

    async startNewGame(opponent) {
        const gameKey = this.game.createGameKey(this.currentPlayer, opponent);
        this.currentGameKey = gameKey;
        this.ui.showGameScreen(gameKey);
        
        // Determinar estado inicial
        const gameState = this.game.reconstructGame(gameKey, this.gameData.actions);
        this.updateGameDisplay(gameState);
    }

    async resumeGame(gameKey) {
        this.currentGameKey = gameKey;
        this.ui.showGameScreen(gameKey);
        
        const gameState = this.game.reconstructGame(gameKey, this.gameData.actions);
        this.updateGameDisplay(gameState);
    }

    async makeChoice(choice) {
        if (!this.currentGameKey || !this.currentPlayer) return;
        
        const gameState = this.game.reconstructGame(this.currentGameKey, this.gameData.actions);
        
        // Verificar se já escolheu nesta rodada
        const choices = this.game.getRoundChoices(
            this.currentGameKey, 
            gameState.currentRound, 
            this.gameData.actions
        );
        
        if (choices[this.currentPlayer]) {
            alert('Você já fez sua escolha nesta rodada!');
            return;
        }

        // Salvar escolha
        const action = {
            type: 'choice',
            player: this.currentPlayer,
            choice: choice,
            round: gameState.currentRound,
            gameKey: this.currentGameKey
        };

        await this.firebase.addAction(action);
        
        // Mostrar estado de espera
        this.ui.showGameState('waiting');
        this.ui.disableChoiceButtons();
        
        // Verificar se pode processar rodada
        await this.checkAndProcessRound();
    }

    async nextRound() {
        const gameState = this.game.reconstructGame(this.currentGameKey, this.gameData.actions);
        this.updateGameDisplay(gameState);
    }

    backToGames() {
        this.currentGameKey = null;
        this.ui.showGamesScreen(this.currentPlayer);
        this.updateGamesLists();
    }

    async showOverallRanking() {
        const ranking = this.game.calculateOverallRanking(this.gameData.actions);
        this.ui.showRankingModal(ranking);
    }

    async resetTournament() {
        if (!confirm('Tem certeza que deseja zerar todo o torneio? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            await this.firebase.reset();
            alert('Torneio zerado com sucesso!');
            
            if (this.currentPlayer) {
                this.updateGamesLists();
            }
        } catch (error) {
            console.error('Erro ao resetar:', error);
            alert('Erro ao resetar o torneio.');
        }
    }

    // === LÓGICA INTERNA ===
    async checkAndProcessRound() {
        if (!this.currentGameKey) return;
        
        const gameState = this.game.reconstructGame(this.currentGameKey, this.gameData.actions);
        
        // Verificar se pode processar
        if (!this.game.canProcessRound(this.currentGameKey, gameState.currentRound, this.gameData.actions)) {
            return; // Aguardando outro jogador
        }

        // Verificar se já foi processada
        if (this.game.isRoundProcessed(this.currentGameKey, gameState.currentRound, this.gameData.actions)) {
            return; // Já processada
        }

        // Processar rodada
        const choices = this.game.getRoundChoices(
            this.currentGameKey, 
            gameState.currentRound, 
            this.gameData.actions
        );
        
        const [player1, player2] = this.currentGameKey.split('-');
        const result = this.game.processRound(
            this.currentGameKey,
            gameState.currentRound,
            player1,
            player2,
            choices[player1],
            choices[player2]
        );

        // Salvar resultado
        const resultAction = {
            type: 'roundResult',
            gameKey: this.currentGameKey,
            round: gameState.currentRound,
            result: result
        };

        await this.firebase.addAction(resultAction);

        // Verificar se jogo terminou
        if (gameState.currentRound >= 10) {
            const finalScores = this.game.calculateGameScores(
                [...gameState.results, result], 
                player1, 
                player2
            );

            const completeAction = {
                type: 'gameComplete',
                gameKey: this.currentGameKey,
                scores: finalScores
            };

            await this.firebase.addAction(completeAction);
        }
    }

    updateGameDisplay(gameState) {
        if (gameState.isComplete) {
            // Jogo completo
            const [player1, player2] = this.currentGameKey.split('-');
            const finalScores = this.game.calculateGameScores(gameState.results, player1, player2);
            this.ui.showGameState('final', { scores: finalScores });
        } else if (gameState.results.length > 0) {
            // Mostrar último resultado
            const lastResult = gameState.results[gameState.results.length - 1];
            this.ui.showGameState('result', { result: lastResult });
        } else {
            // Primeira rodada ou próxima rodada
            const choices = this.game.getRoundChoices(
                this.currentGameKey, 
                gameState.currentRound, 
                this.gameData.actions
            );

            if (choices[this.currentPlayer]) {
                // Já escolheu, aguardando
                this.ui.showGameState('waiting');
                this.ui.disableChoiceButtons();
            } else {
                // Pode escolher
                this.ui.showGameState('choice', { round: gameState.currentRound });
                this.ui.enableChoiceButtons();
            }
        }

        // Atualizar indicadores
        this.ui.updateRoundIndicators(gameState.results);
    }

    updateGamesLists() {
        if (!this.currentPlayer) return;
        
        const games = this.game.getGamesByStatus(this.currentPlayer, this.gameData.actions);
        this.ui.updateGamesLists(games);
    }

    handleDataChange() {
        // Atualizar display se estiver em um jogo
        if (this.currentGameKey) {
            const gameState = this.game.reconstructGame(this.currentGameKey, this.gameData.actions);
            this.updateGameDisplay(gameState);
        }
        
        // Atualizar listas se estiver na tela de jogos
        if (this.currentPlayer && !this.currentGameKey) {
            this.updateGamesLists();
        }
    }
}

// Inicialização global
window.app = null;

document.addEventListener('DOMContentLoaded', async () => {
    window.app = new PrisonersDilemmaApp();
    await window.app.initialize();
});