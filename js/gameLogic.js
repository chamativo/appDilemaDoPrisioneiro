// Lógica do jogo (regras, pontuação, etc)
class GameLogic {
    constructor() {
        this.players = ['Arthur', 'Laura', 'Sergio', 'Larissa'];
    }

    // Calcular pontos baseado nas escolhas
    calculatePoints(choice1, choice2) {
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
        const points = this.calculatePoints(choice1, choice2);
        
        return {
            round: round,
            player1Choice: choice1,
            player2Choice: choice2,
            player1Points: points.player1,
            player2Points: points.player2
        };
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
    getOpponents(currentPlayer) {
        return this.players.filter(p => p !== currentPlayer);
    }

    // Obter jogos pendentes (nunca iniciados)
    getPendingGames(currentPlayer, gameState) {
        return this.getOpponents(currentPlayer).filter(opponent => {
            const gameKey = gameState.getGameKey(currentPlayer, opponent);
            const hasAnyAction = gameState.gameData.actions.some(a => a.gameKey === gameKey);
            return !hasAnyAction;
        });
    }

    // Obter jogos ativos (iniciados mas não completos)
    getActiveGames(currentPlayer, gameState) {
        return this.getOpponents(currentPlayer).filter(opponent => {
            const gameKey = gameState.getGameKey(currentPlayer, opponent);
            return gameState.isGameActive(gameKey);
        });
    }

    // Obter histórico de jogos do jogador
    getPlayerGameHistory(player, gameState) {
        return gameState.gameData.actions
            .filter(a => a.type === 'gameComplete')
            .map(action => {
                const [player1, player2] = action.gameKey.split('-');
                const opponent = player1 === player ? player2 : player1;
                const playerScore = action.scores[player] || 0;
                const opponentScore = action.scores[opponent] || 0;
                
                let result = 'empate';
                if (playerScore > opponentScore) result = 'vitoria';
                else if (playerScore < opponentScore) result = 'derrota';
                
                return {
                    opponent,
                    playerScore,
                    opponentScore,
                    result
                };
            })
            .filter(game => game.opponent);
    }

    // Verificar se um jogo pode ser processado (ambos jogadores fizeram escolha)
    canProcessRound(gameKey, round, gameState) {
        const choices = gameState.getRoundChoices(gameKey, round);
        const [player1, player2] = gameKey.split('-');
        
        const hasPlayer1Choice = choices[player1] !== undefined;
        const hasPlayer2Choice = choices[player2] !== undefined;
        
        debug.log(`🎯 Round ${round}: ${player1}=${choices[player1] || 'nada'}, ${player2}=${choices[player2] || 'nada'}`);
        
        return hasPlayer1Choice && hasPlayer2Choice;
    }

    // Verificar se resultado da rodada já foi processado
    isRoundProcessed(gameKey, round, gameState) {
        return gameState.gameData.actions.some(a => 
            a.type === 'roundResult' && 
            a.gameKey === gameKey && 
            a.round === round
        );
    }
}