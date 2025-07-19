// Repository para jogos - usa FirebaseAdapter
import FirebaseAdapter from './firebaseAdapter.js';

class GameRepository {
  constructor() {
    this.firebase = new FirebaseAdapter();
  }

  // Conecta ao Firebase
  async connect(firebaseConfig) {
    await this.firebase.connect(firebaseConfig);
  }

  // Submete escolha conforme FLUXO DE EVENTOS da especificação
  async submitChoice(player, gameKey, round, choice) {
    await this.firebase.saveChoice(gameKey, player, choice, round);
  }

  // Processa resultado de rodada
  async processRoundResult(gameKey, round, result) {
    await this.firebase.saveRoundResult(gameKey, round, result);
  }

  // Marca jogo como completo
  async completeGame(gameKey, scores) {
    await this.firebase.saveGameComplete(gameKey, scores);
  }

  // Atualiza ranking geral
  async updateTotalScores(scores) {
    await this.firebase.updateScores(scores);
  }

  // Escuta mudanças em jogo específico
  onGameChange(gameKey, callback) {
    this.firebase.listenToGame(gameKey, callback);
  }

  // Para de escutar mudanças
  stopListening(gameKey) {
    this.firebase.stopListening(gameKey);
  }

  // Reset do torneio
  async resetAll() {
    await this.firebase.resetTournament();
  }
}

export default GameRepository;