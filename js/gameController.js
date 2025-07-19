// Controlador de uma partida específica (A vs B)
class GameController {
    constructor(gameKey, player1, player2, gameState, gameLogic) {
        this.gameKey = gameKey;
        this.player1 = player1;
        this.player2 = player2;
        this.gameState = gameState;
        this.gameLogic = gameLogic;
        
        this.currentRound = 1;
        this.isComplete = false;
        this.results = [];
        
        debug.log(`🎮 GameController criado: ${player1} vs ${player2}`);
    }

    // Inicializar/reconstruir estado da partida
    initialize() {
        const gameData = this.gameState.reconstructGame(this.gameKey);
        this.currentRound = gameData.currentRound;
        this.isComplete = gameData.gameComplete;
        this.results = gameData.results;
        
        debug.log(`📊 Partida ${this.gameKey}: rodada ${this.currentRound}, ${this.results.length} resultados, completa: ${this.isComplete}`);
        return this.getStatus();
    }

    // Status atual da partida
    getStatus() {
        const choices = this.gameState.getRoundChoices(this.gameKey, this.currentRound);
        const player1Played = !!choices[this.player1];
        const player2Played = !!choices[this.player2];

        return {
            gameKey: this.gameKey,
            player1: this.player1,
            player2: this.player2,
            currentRound: this.currentRound,
            isComplete: this.isComplete,
            player1Played: player1Played,
            player2Played: player2Played,
            waitingFor: this.getWaitingFor(player1Played, player2Played),
            canProcess: player1Played && player2Played,
            results: this.results
        };
    }

    getWaitingFor(player1Played, player2Played) {
        if (this.isComplete) return 'none';
        if (!player1Played && !player2Played) return 'both';
        if (!player1Played) return this.player1;
        if (!player2Played) return this.player2;
        return 'processing';
    }

    // Processar jogada de um jogador
    async makePlayerChoice(player, choice) {
        if (this.isComplete) {
            debug.log(`⚠️ Jogo ${this.gameKey} já está completo`);
            return { success: false, reason: 'game_complete' };
        }

        if (this.currentRound > 10) {
            debug.log(`⚠️ Jogo ${this.gameKey} excedeu 10 rodadas`);
            return { success: false, reason: 'max_rounds' };
        }

        // Verificar se jogador já jogou esta rodada
        if (this.gameState.hasPlayerChosenInRound(this.gameKey, this.currentRound, player)) {
            debug.log(`⚠️ ${player} já jogou rodada ${this.currentRound}`);
            return { success: false, reason: 'already_played' };
        }

        // Salvar escolha
        await this.gameState.addAction({
            player: player,
            choice: choice,
            round: this.currentRound,
            gameKey: this.gameKey
        });

        debug.log(`✅ ${player} jogou ${choice} na rodada ${this.currentRound}`);
        return { success: true };
    }

    // Processar rodada quando ambos jogaram
    async processRoundIfReady(currentPlayer) {
        const status = this.getStatus();
        
        if (!status.canProcess) {
            debug.log(`⏳ Rodada ${this.currentRound} não está pronta: aguardando ${status.waitingFor}`);
            return { processed: false, waitingFor: status.waitingFor };
        }

        // Verificar se já foi processada
        if (this.gameLogic.isRoundProcessed(this.gameKey, this.currentRound, this.gameState)) {
            debug.log(`✅ Rodada ${this.currentRound} já foi processada`);
            return { processed: true, alreadyProcessed: true };
        }

        // Processar apenas se for o player1 (evitar duplicação)
        if (currentPlayer !== this.player1) {
            debug.log(`⏳ ${currentPlayer} aguardando ${this.player1} processar rodada ${this.currentRound}`);
            return { processed: false, waitingFor: 'player1_processing' };
        }

        debug.log(`⚡ Processando rodada ${this.currentRound}: ${this.player1} vs ${this.player2}`);

        const result = await this.gameLogic.processRoundIfBothPlayersChose(
            this.gameKey,
            this.currentRound,
            this.gameState,
            currentPlayer
        );

        if (result) {
            this.results.push(result);
            debug.log(`📋 Resultado rodada ${this.currentRound}: ${this.player1}=${result.player1Points}, ${this.player2}=${result.player2Points}`);
        }

        // Avançar para próxima rodada
        this.currentRound++;
        debug.log(`➡️ Avançando para rodada ${this.currentRound}`);

        // Verificar se jogo terminou
        if (this.currentRound > 10) {
            await this.finalizeGame(currentPlayer);
        }

        return { 
            processed: true, 
            result: result,
            nextRound: this.currentRound,
            gameComplete: this.isComplete 
        };
    }

    // Finalizar jogo
    async finalizeGame(currentPlayer) {
        if (this.isComplete) {
            debug.log(`🏁 Jogo ${this.gameKey} já está completo`);
            return;
        }

        const endResult = await this.gameLogic.endGameIfNeeded(
            this.gameKey,
            this.gameState,
            currentPlayer,
            this.player1,
            this.player2
        );

        if (endResult.shouldEnd) {
            this.isComplete = true;
            debug.log(`🏁 Jogo ${this.gameKey} finalizado!`);
        }

        return endResult;
    }

    // Obter últimos resultados para exibição
    getLatestResult() {
        const latest = this.results[this.results.length - 1] || null;
        debug.log(`🔍 getLatestResult: ${this.results.length} resultados, latest = ${latest ? `rodada ${latest.round}` : 'null'}`);
        return latest;
    }

    // Debug: estado completo da partida
    getDebugInfo() {
        return {
            gameKey: this.gameKey,
            players: `${this.player1} vs ${this.player2}`,
            currentRound: this.currentRound,
            isComplete: this.isComplete,
            totalResults: this.results.length,
            status: this.getStatus()
        };
    }
}