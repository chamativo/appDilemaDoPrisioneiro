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

  // Reset completo do torneio - LIMPA FIREBASE INTEIRO
  async resetTournament() {
    console.log('🧹 Limpando Firebase inteiro...');
    await this.db.ref().remove(); // Remove TUDO
    console.log('🧹 Firebase completamente limpo!');
  }
}

export default FirebaseAdapter;