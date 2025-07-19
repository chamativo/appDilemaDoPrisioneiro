// Gerenciamento de estado do jogo
class GameState {
    constructor(firebaseManager) {
        this.firebase = firebaseManager;
        this.gameData = {
            scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
            actions: []
        };
    }

    async initialize() {
        const connected = await this.firebase.connect();
        
        if (connected) {
            this.gameData = await this.firebase.initializeData();
            this.firebase.onDataChange((data) => {
                this.gameData = data;
                this.notifyChange();
            });
        } else {
            this.gameData = this.firebase.loadFromLocalStorage();
            this.setupStorageListener();
        }

        return this.gameData;
    }

    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'prisonersDilemmaData') {
                this.gameData = JSON.parse(e.newValue);
                this.notifyChange();
            }
        });

        window.addEventListener('gameDataChanged', (e) => {
            this.gameData = e.detail;
            this.notifyChange();
        });
    }

    notifyChange() {
        window.dispatchEvent(new CustomEvent('gameStateChanged', { 
            detail: this.gameData 
        }));
    }

    async addAction(action) {
        action.timestamp = Date.now();
        this.gameData.actions.push(action);
        await this.firebase.saveData(this.gameData);
        debug.log(`📝 Action adicionada: ${action.type || 'choice'} - ${action.player || ''}`);
    }

    getGameKey(player1, player2) {
        return [player1, player2].sort().join('-');
    }

    // Reconstruir estado de um jogo específico baseado nas actions
    reconstructGame(gameKey) {
        const gameActions = this.gameData.actions
            .filter(a => a.gameKey === gameKey)
            .sort((a, b) => a.timestamp - b.timestamp);

        const results = [];
        let currentRound = 1;
        let gameComplete = false;

        gameActions.forEach(action => {
            if (action.type === 'roundResult') {
                results.push(action.result);
                currentRound = results.length + 1;
            } else if (action.type === 'gameComplete') {
                gameComplete = true;
            }
        });

        debug.log(`🔄 Game ${gameKey}: rodada ${currentRound}, ${results.length} resultados, completo: ${gameComplete}`);

        return {
            currentRound: gameComplete ? 11 : currentRound,
            results: results,
            gameComplete: gameComplete
        };
    }

    // Pegar escolhas de uma rodada específica
    getRoundChoices(gameKey, round) {
        const choices = {};
        const roundActions = this.gameData.actions
            .filter(a => a.gameKey === gameKey && a.round === round && a.choice)
            .sort((a, b) => a.timestamp - b.timestamp);

        debug.log(`🔍 Rodada ${round}: encontrados ${roundActions.length} actions`);

        // Pegar apenas a primeira escolha de cada jogador
        roundActions.forEach((action) => {
            if (!choices[action.player]) {
                debug.log(`   ✅ ${action.player} = ${action.choice}`);
                choices[action.player] = action.choice;
            } else {
                debug.log(`   ⚠️ ${action.player} = ${action.choice} (DUPLICADA)`);
            }
        });

        return choices;
    }

    // Verificar se jogador já fez escolha nesta rodada
    hasPlayerChosenInRound(gameKey, round, player) {
        return this.gameData.actions.some(a => 
            a.gameKey === gameKey && 
            a.round === round && 
            a.player === player && 
            a.choice
        );
    }

    // Verificar se jogo está ativo (iniciado mas não completo)
    isGameActive(gameKey) {
        const gameActions = this.gameData.actions.filter(a => a.gameKey === gameKey);
        const hasCompletedAction = this.gameData.actions.some(a => 
            a.gameKey === gameKey && a.type === 'gameComplete'
        );
        return gameActions.length > 0 && !hasCompletedAction;
    }

    // Reset completo do torneio
    async reset() {
        debug.log('🔄 Iniciando reset do torneio...');
        
        // Limpar dados locais
        this.gameData = {
            scores: { Arthur: 0, Laura: 0, Sergio: 0, Larissa: 0 },
            actions: []
        };
        
        // Salvar em todas as fontes possíveis
        await this.firebase.saveData(this.gameData);
        
        // Forçar limpeza do localStorage também
        localStorage.setItem('prisonersDilemmaData', JSON.stringify(this.gameData));
        
        // Disparar evento de mudança para sincronizar todas as instâncias
        this.notifyChange();
        
        debug.log('✅ Torneio resetado completamente');
        debug.log(`📊 Estado após reset: ${this.gameData.actions.length} actions, scores:`, this.gameData.scores);
    }
}