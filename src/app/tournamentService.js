// TournamentService - orquestração do torneio
import GameRepository from '../data/gameRepo.js';
import { calculateRanking, generateAllGamePairs } from '../domain/tournament.js';
import eventBus from './eventBus.js';

class TournamentService {
  constructor() {
    this.gameRepo = new GameRepository();
  }

  // Conecta serviços
  async connect(firebaseConfig) {
    await this.gameRepo.connect(firebaseConfig);
  }

  // Calcula ranking geral
  calculateGeneralRanking(scores) {
    return calculateRanking(scores);
  }

  // Reset completo do torneio
  async resetTournament() {
    try {
      await this.gameRepo.resetAll();
      eventBus.emit('tournamentReset');
    } catch (error) {
      eventBus.emit('error', { type: 'resetTournament', error });
    }
  }

  // Gera todos os jogos possíveis
  getAllGamePairs() {
    return generateAllGamePairs();
  }

  // Atualiza scores totais no Firebase
  async updateTotalScores(scores) {
    try {
      await this.gameRepo.updateTotalScores(scores);
      eventBus.emit('scoresUpdated', scores);
    } catch (error) {
      eventBus.emit('error', { type: 'updateScores', error });
    }
  }
}

export default TournamentService;