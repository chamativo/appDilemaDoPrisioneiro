// Firebase adapter - ÚNICA camada que acessa Firebase
// ESTRUTURA: /games/{gameKey}, /scores/{playerId}, /meta/version

class FirebaseAdapter {
  constructor() {
    this.db = null;
    this.listeners = new Map();
  }

  // Conecta ao Firebase
  async connect(firebaseConfig) {
    if (!firebaseConfig) {
      throw new Error('Firebase config não fornecida');
    }
    
    firebase.initializeApp(firebaseConfig);
    this.db = firebase.database();
  }

  // Grava escolha do jogador conforme especificação
  async saveChoice(gameKey, player, choice, round) {
    const choiceData = {
      type: 'choice',
      player,
      choice,
      round,
      gameKey,
      timestamp: Date.now()
    };
    
    await this.db.ref(`games/${gameKey}/choices/${round}/${player}`).set(choiceData);
  }

  // Grava resultado da rodada
  async saveRoundResult(gameKey, round, result) {
    const resultData = {
      type: 'roundResult',
      gameKey,
      round,
      result,
      timestamp: Date.now()
    };
    
    await this.db.ref(`games/${gameKey}/results/${round}`).set(resultData);
  }

  // Grava jogo completo
  async saveGameComplete(gameKey, scores) {
    const completeData = {
      type: 'gameComplete',
      gameKey,
      scores,
      timestamp: Date.now()
    };
    
    await this.db.ref(`games/${gameKey}/complete`).set(completeData);
  }

  // Atualiza scores totais
  async updateScores(scores) {
    const updates = {};
    Object.keys(scores).forEach(player => {
      updates[`scores/${player}`] = scores[player];
    });
    
    await this.db.ref().update(updates);
  }

  // Escuta mudanças em um jogo
  listenToGame(gameKey, callback) {
    const ref = this.db.ref(`games/${gameKey}`);
    ref.on('value', callback);
    this.listeners.set(gameKey, ref);
  }

  // Remove listener
  stopListening(gameKey) {
    const ref = this.listeners.get(gameKey);
    if (ref) {
      ref.off();
      this.listeners.delete(gameKey);
    }
  }

  // Busca dados de um jogo específico
  async getGameData(gameKey) {
    try {
      const snapshot = await this.db.ref(`games/${gameKey}`).once('value');
      const data = snapshot.val();
      
      if (!data) {
        return null;
      }

      // Analisa o estado do jogo baseado nos dados
      const choices = data.choices || {};
      const results = data.results || {};
      const complete = data.complete;

      if (complete) {
        return {
          status: 'completed',
          scores: complete.scores,
          currentRound: 10
        };
      }

      // Verifica quantas rodadas foram processadas
      const processedRounds = Object.keys(results).length;
      const pendingRounds = Object.keys(choices).filter(round => !results[round]);

      if (pendingRounds.length > 0) {
        return {
          status: 'pending',
          currentRound: parseInt(pendingRounds[0]),
          scores: this.calculateCurrentScores(results)
        };
      }

      if (processedRounds > 0) {
        const nextRound = processedRounds + 1;
        
        // Se chegou na rodada 11, o jogo está completo
        if (nextRound > 10) {
          return {
            status: 'completed',
            currentRound: 10,
            scores: this.calculateCurrentScores(results)
          };
        }
        
        return {
          status: 'active',
          currentRound: nextRound,
          scores: this.calculateCurrentScores(results)
        };
      }

      return {
        status: 'new',
        currentRound: 1,
        scores: {}
      };
    } catch (error) {
      console.error('Erro ao buscar dados do jogo:', error);
      return null;
    }
  }

  // Busca scores totais dos jogadores
  async getTotalScores() {
    try {
      const snapshot = await this.db.ref('scores').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('Erro ao buscar scores totais:', error);
      return {};
    }
  }

  // Calcula scores atuais baseado nos resultados processados
  calculateCurrentScores(results) {
    const scores = {};
    
    Object.values(results).forEach(roundData => {
      if (roundData.result) {
        const { player1, player2, player1Points, player2Points } = roundData.result;
        scores[player1] = (scores[player1] || 0) + (player1Points || 0);
        scores[player2] = (scores[player2] || 0) + (player2Points || 0);
      }
    });

    return scores;
  }

  // Reset completo do torneio - LIMPA FIREBASE INTEIRO
  async resetTournament() {
    console.log('🧹 Limpando Firebase inteiro...');
    await this.db.ref().remove(); // Remove TUDO
    console.log('🧹 Firebase completamente limpo!');
  }
}

export default FirebaseAdapter;