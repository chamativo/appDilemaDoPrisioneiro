// Controlador CHEFE de uma partida específica (A vs B)
class GameController {
    constructor(gameKey, player1, player2, firebaseManager, gameLogic, ui) {
        this.gameKey = gameKey;
        this.player1 = player1;
        this.player2 = player2;
        this.firebase = firebaseManager;
        this.gameLogic = gameLogic;
        this.ui = ui;
        
        this.currentRound = 1;
        this.isComplete = false;
        this.results = [];
        this.gameData = null;
        
        debug.log(`👑 GameController CHEFE criado: ${player1} vs ${player2}`);
    }

    // Inicializar partida - CHEFE COMANDA TUDO
    async initialize() {
        debug.log(`👑 Inicializando controle da partida ${this.gameKey}...`);
        
        // Carregar dados do Firebase
        await this.loadGameData();
        
        // Reconstruir estado
        this.reconstructGameState();
        
        // Comandar UI inicial
        this.updateUI();
        
        debug.log(`✅ Partida ${this.gameKey}: rodada ${this.currentRound}, ${this.results.length} resultados, completa: ${this.isComplete}`);
        return this.getStatus();
    }

    // Carregar dados do Firebase
    async loadGameData() {
        try {
            const snapshot = await this.firebase.db.ref('gameData').once('value');
            this.gameData = snapshot.exists() ? snapshot.val() : { actions: [] };
            
            if (!this.gameData.actions) {
                this.gameData.actions = [];
            }
            
            debug.log(`📡 Dados carregados: ${this.gameData.actions.length} actions`);
        } catch (error) {
            debug.log(`❌ Erro ao carregar dados: ${error.message}`);
            this.gameData = { actions: [] };
        }
    }

    // Reconstruir estado da partida
    reconstructGameState() {
        const gameActions = this.gameData.actions
            .filter(a => a.gameKey === this.gameKey)
            .sort((a, b) => a.timestamp - b.timestamp);

        this.results = [];
        this.currentRound = 1;
        this.isComplete = false;

        gameActions.forEach(action => {
            if (action.type === 'roundResult') {
                this.results.push(action.result);
                this.currentRound = this.results.length + 1;
            } else if (action.type === 'gameComplete') {
                this.isComplete = true;
            }
        });

        debug.log(`🔄 Estado reconstruído: rodada ${this.currentRound}, ${this.results.length} resultados`);
    }

    // COMANDAR A UI - GameController decide o que mostrar
    updateUI() {
        debug.log(`👑 GameController comandando UI...`);
        
        if (this.isComplete) {
            debug.log(`🏁 Jogo completo - comandando UI para mostrar resultado final`);
            this.ui.commandShowFinalResult(this.calculateFinalScores());
            return;
        }

        if (this.currentRound > 10) {
            debug.log(`🏁 Todas as rodadas completadas - finalizando jogo`);
            this.finalizeGame();
            return;
        }

        // Verificar se há resultado novo para mostrar
        const latestResult = this.getLatestResult();
        if (latestResult && this.shouldShowResult(latestResult)) {
            debug.log(`🎊 Comandando UI para mostrar resultado da rodada ${latestResult.round}`);
            this.ui.commandShowRoundResult(latestResult);
            return;
        }

        // Verificar estado da rodada atual
        const status = this.getRoundStatus();
        
        if (status.waitingFor === 'both' || status.waitingFor === this.ui.currentPlayer) {
            debug.log(`🎯 Comandando UI para mostrar escolhas - vez de ${this.ui.currentPlayer}`);
            this.ui.commandShowChoices(this.currentRound);
        } else if (status.waitingFor === 'processing') {
            debug.log(`⚡ Comandando UI para mostrar processamento`);
            this.ui.commandShowProcessing();
        } else {
            debug.log(`⏳ Comandando UI para mostrar espera - aguardando ${status.waitingFor}`);
            this.ui.commandShowWaiting(status.waitingFor);
        }
    }

    // Verificar se deve mostrar resultado
    shouldShowResult(result) {
        // Se nunca mostrou resultado ou se é um resultado mais novo
        return !this.ui.lastShownResult || result.round > this.ui.lastShownResult.round;
    }

    // Calcular pontuação final
    calculateFinalScores() {
        return this.gameLogic.calculateGameScores(this.results, this.player1, this.player2);
    }

    // Status atual da partida
    getStatus() {
        const choices = this.getRoundChoices();
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

    // PROCESSAR JOGADA - GameController é responsável por tudo
    async playerMadeChoice(player, choice) {
        debug.log(`👑 ${player} fez escolha: ${choice} na rodada ${this.currentRound}`);
        
        if (this.isComplete) {
            debug.log(`⚠️ Jogo ${this.gameKey} já está completo`);
            return { success: false, reason: 'game_complete' };
        }

        if (this.currentRound > 10) {
            debug.log(`⚠️ Jogo ${this.gameKey} excedeu 10 rodadas`);
            return { success: false, reason: 'max_rounds' };
        }

        // Verificar se jogador já jogou esta rodada
        if (this.hasPlayerChosenInRound(player)) {
            debug.log(`⚠️ ${player} já jogou rodada ${this.currentRound}`);
            return { success: false, reason: 'already_played' };
        }

        // Salvar escolha no Firebase
        await this.savePlayerChoice(player, choice);

        // Recarregar dados e atualizar estado
        await this.loadGameData();
        this.reconstructGameState();

        // Verificar se precisa processar rodada
        const roundStatus = this.getRoundStatus();
        if (roundStatus.canProcess && !this.isRoundProcessed()) {
            await this.processCurrentRound();
        }

        // Comandar UI para nova situação
        this.updateUI();

        debug.log(`✅ ${player} jogada processada com sucesso`);
        return { success: true };
    }

    // Salvar escolha do jogador no Firebase
    async savePlayerChoice(player, choice) {
        const action = {
            type: 'choice',
            player: player,
            choice: choice,
            round: this.currentRound,
            gameKey: this.gameKey,
            timestamp: Date.now()
        };

        this.gameData.actions.push(action);
        await this.firebase.saveData(this.gameData);
        debug.log(`💾 Escolha de ${player} salva no Firebase`);
    }

    // Verificar se jogador já escolheu nesta rodada
    hasPlayerChosenInRound(player) {
        return this.gameData.actions.some(a => 
            a.gameKey === this.gameKey && 
            a.round === this.currentRound && 
            a.player === player && 
            a.choice
        );
    }

    // Processar rodada atual
    async processCurrentRound() {
        debug.log(`⚡ GameController processando rodada ${this.currentRound}...`);
        
        const choices = this.getRoundChoices();
        const result = this.gameLogic.processRound(
            this.gameKey,
            this.currentRound,
            this.player1,
            this.player2,
            choices[this.player1],
            choices[this.player2]
        );

        // Salvar resultado no Firebase
        await this.saveRoundResult(result);
        
        // Atualizar estado local
        this.results.push(result);
        this.currentRound++;

        debug.log(`✅ Rodada processada: ${this.player1}=${result.player1Points}, ${this.player2}=${result.player2Points}`);
        
        // Se foi a última rodada, finalizar jogo
        if (this.currentRound > 10) {
            await this.finalizeGame();
        }
    }

    // Salvar resultado da rodada no Firebase
    async saveRoundResult(result) {
        const action = {
            type: 'roundResult',
            gameKey: this.gameKey,
            round: this.currentRound,
            result: result,
            timestamp: Date.now()
        };

        this.gameData.actions.push(action);
        await this.firebase.saveData(this.gameData);
        debug.log(`💾 Resultado da rodada ${this.currentRound} salvo no Firebase`);
    }

    // Obter escolhas da rodada atual
    getRoundChoices() {
        const choices = {};
        const roundActions = this.gameData.actions
            .filter(a => a.gameKey === this.gameKey && a.round === this.currentRound && a.choice)
            .sort((a, b) => a.timestamp - b.timestamp);

        roundActions.forEach(action => {
            if (!choices[action.player]) {
                choices[action.player] = action.choice;
            }
        });

        return choices;
    }

    // Verificar se rodada já foi processada
    isRoundProcessed() {
        return this.gameData.actions.some(a => 
            a.type === 'roundResult' && 
            a.gameKey === this.gameKey && 
            a.round === this.currentRound
        );
    }

    // Obter status da rodada atual
    getRoundStatus() {
        const choices = this.getRoundChoices();
        const player1Played = !!choices[this.player1];
        const player2Played = !!choices[this.player2];

        return {
            player1Played,
            player2Played,
            canProcess: player1Played && player2Played,
            waitingFor: this.getWaitingFor(player1Played, player2Played)
        };
    }

    // MÉTODO REMOVIDO - lógica agora está em processCurrentRound()

    // Finalizar jogo
    async finalizeGame() {
        if (this.isComplete) {
            debug.log(`🏁 Jogo ${this.gameKey} já está completo`);
            return;
        }

        // Verificar se resultado final já foi salvo
        const gameCompleteExists = this.gameData.actions.some(a => 
            a.type === 'gameComplete' && 
            a.gameKey === this.gameKey
        );

        if (gameCompleteExists) {
            debug.log('🏁 Jogo já marcado como completo');
            this.isComplete = true;
            return { shouldEnd: true, alreadyComplete: true };
        }

        const totalPoints = this.calculateFinalScores();
        
        // Salvar gameComplete no Firebase
        const action = {
            type: 'gameComplete',
            gameKey: this.gameKey,
            scores: totalPoints,
            timestamp: Date.now()
        };

        this.gameData.actions.push(action);
        await this.firebase.saveData(this.gameData);
        
        this.isComplete = true;
        debug.log(`🏁 Jogo ${this.gameKey} finalizado com sucesso!`);
        
        return { shouldEnd: true, totalPoints: totalPoints };
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