// Módulo Game - Apenas lógica do Dilema do Prisioneiro
class GameModule {
    constructor() {
        this.players = ['Arthur', 'Laura', 'Sergio', 'Larissa'];
    }

    // Criar chave do jogo (sempre ordem alfabética)
    createGameKey(player1, player2) {
        return [player1, player2].sort().join('-');
    }

    // Calcular pontos de uma rodada
    calculateRoundPoints(choice1, choice2) {
        if (choice1 === 'cooperate' && choice2 === 'cooperate') {
            return { player1: 3, player2: 3 };
        } else if (choice1 === 'cooperate' && choice2 === 'defect') {
            return { player1: 0, player2: 5 };
        } else if (choice1 === 'defect' && choice2 === 'cooperate') {
            return { player1: 5, player2: 0 };
        } else {
            return { player1: 1, player2: 1 };
        }
    }

    // Processar resultado de uma rodada
    processRound(gameKey, round, player1, player2, choice1, choice2) {
        const points = this.calculateRoundPoints(choice1, choice2);
        
        return {
            round: round,
            player1Choice: choice1,
            player2Choice: choice2,
            player1Points: points.player1,
            player2Points: points.player2
        };
    }

    // Reconstruir estado de um jogo específico
    reconstructGame(gameKey, actions) {
        const gameActions = actions
            .filter(a => a.gameKey === gameKey)
            .sort((a, b) => a.timestamp - b.timestamp);

        const results = [];
        let currentRound = 1;
        let isComplete = false;

        gameActions.forEach(action => {
            if (action.type === 'roundResult') {
                results.push(action.result);
                currentRound = results.length + 1;
            } else if (action.type === 'gameComplete') {
                isComplete = true;
            }
        });

        return {
            currentRound: isComplete ? 11 : currentRound,
            results: results,
            isComplete: isComplete
        };
    }

    // Obter escolhas de uma rodada específica
    getRoundChoices(gameKey, round, actions) {
        const choices = {};
        const roundActions = actions
            .filter(a => a.gameKey === gameKey && a.round === round && a.choice)
            .sort((a, b) => a.timestamp - b.timestamp);

        // Primeira escolha de cada jogador vale
        roundActions.forEach(action => {
            if (!choices[action.player]) {
                choices[action.player] = action.choice;
            }
        });

        return choices;
    }

    // Verificar se rodada pode ser processada
    canProcessRound(gameKey, round, actions) {
        const choices = this.getRoundChoices(gameKey, round, actions);
        const [player1, player2] = gameKey.split('-');
        return choices[player1] && choices[player2];
    }

    // Verificar se rodada já foi processada
    isRoundProcessed(gameKey, round, actions) {
        return actions.some(a => 
            a.type === 'roundResult' && 
            a.gameKey === gameKey && 
            a.round === round
        );
    }

    // Calcular pontuação total de um jogo
    calculateGameScores(results, player1, player2) {
        return results.reduce((acc, result) => {
            acc[player1] += result.player1Points;
            acc[player2] += result.player2Points;
            return acc;
        }, { [player1]: 0, [player2]: 0 });
    }

    // Obter oponentes disponíveis para um jogador
    getAvailableOpponents(currentPlayer) {
        return this.players.filter(p => p !== currentPlayer);
    }

    // Obter jogos por status
    getGamesByStatus(currentPlayer, actions) {
        const opponents = this.getAvailableOpponents(currentPlayer);
        const games = {
            pending: [],    // Iniciados mas não terminados
            available: [],  // Nunca iniciados
            completed: []   // Terminados
        };

        opponents.forEach(opponent => {
            const gameKey = this.createGameKey(currentPlayer, opponent);
            const gameActions = actions.filter(a => a.gameKey === gameKey);
            
            if (gameActions.length === 0) {
                // Nunca iniciado
                games.available.push({
                    opponent: opponent,
                    gameKey: gameKey
                });
            } else {
                const gameState = this.reconstructGame(gameKey, actions);
                
                if (gameState.isComplete) {
                    // Jogo completo
                    const totalScores = this.calculateGameScores(
                        gameState.results, 
                        gameKey.split('-')[0], 
                        gameKey.split('-')[1]
                    );
                    
                    const playerScore = totalScores[currentPlayer];
                    const opponentScore = totalScores[opponent];
                    
                    let result = 'tie';
                    if (playerScore > opponentScore) result = 'victory';
                    else if (playerScore < opponentScore) result = 'defeat';
                    
                    games.completed.push({
                        opponent: opponent,
                        gameKey: gameKey,
                        playerScore: playerScore,
                        opponentScore: opponentScore,
                        result: result
                    });
                } else {
                    // Jogo pendente
                    games.pending.push({
                        opponent: opponent,
                        gameKey: gameKey,
                        currentRound: gameState.currentRound
                    });
                }
            }
        });

        return games;
    }

    // Calcular classificação geral
    calculateOverallRanking(actions) {
        const playerStats = {};
        
        // Inicializar stats
        this.players.forEach(player => {
            playerStats[player] = { totalPoints: 0, games: 0 };
        });

        // Somar pontos de jogos completos
        const completedGames = actions.filter(a => a.type === 'gameComplete');
        
        completedGames.forEach(action => {
            const scores = action.scores;
            Object.keys(scores).forEach(player => {
                if (playerStats[player]) {
                    playerStats[player].totalPoints += scores[player];
                    playerStats[player].games++;
                }
            });
        });

        // Converter para array e ordenar
        return this.players
            .map(player => ({
                name: player,
                totalPoints: playerStats[player].totalPoints,
                games: playerStats[player].games
            }))
            .sort((a, b) => b.totalPoints - a.totalPoints);
    }
}