// GameService - orquestração dos fluxos de jogo
import GameRepository from '../data/gameRepo.js';
import { resolveRound, updateGameTotals } from '../domain/gameState.js';
import { getPlayerIndex } from '../domain/tournament.js';
import eventBus from './eventBus.js';

class GameService {
  constructor() {
    this.gameRepo = new GameRepository();
    this.currentGames = new Map(); // Cache de jogos em memória
  }

  // Conecta serviços
  async connect(firebaseConfig) {
    await this.gameRepo.connect(firebaseConfig);
  }

  // FLUXO: UI chama submitChoice
  async submitChoice(player, gameKey, round, choice) {
    try {
      // Valida entrada
      if (!player || !gameKey || !round || !choice) {
        throw new Error('Parâmetros inválidos');
      }

      // Delega ao gameRepo conforme especificação
      await this.gameRepo.submitChoice(player, gameKey, round, choice);
      
      eventBus.emit('choiceSubmitted', { player, gameKey, round, choice });
    } catch (error) {
      eventBus.emit('error', { type: 'submitChoice', error });
    }
  }

  // Listener detecta rodada completa e processa resultado
  setupGameListener(gameKey) {
    this.gameRepo.onGameChange(gameKey, (snapshot) => {
      const gameData = snapshot.val();
      if (!gameData) return;

      this.processGameData(gameKey, gameData);
    });
  }

  // Processa dados do jogo vindos do Firebase
  processGameData(gameKey, gameData) {
    console.log('🎮 processGameData called:', gameKey, gameData);
    const { choices, results } = gameData;
    
    // Verifica rodadas que podem ser processadas
    if (choices) {
      console.log('🎮 Choices found:', choices);
      Object.keys(choices).forEach(roundNum => {
        console.log('🎮 Processing round:', roundNum, choices[roundNum]);
        this.checkAndProcessRound(gameKey, roundNum, choices[roundNum], results);
      });
    }

    eventBus.emit('gameUpdated', { gameKey, gameData });
  }

  // Verifica se rodada está completa e processa
  checkAndProcessRound(gameKey, roundNum, roundChoices, existingResults) {
    console.log('🔍 checkAndProcessRound:', gameKey, roundNum, roundChoices, existingResults);
    
    // Se já processada, skip
    if (existingResults && existingResults[roundNum]) {
      console.log('🔍 Round already processed, skipping');
      return;
    }

    // Verifica se ambos jogadores escolheram
    const players = Object.keys(roundChoices);
    console.log('🔍 Players who chose:', players);
    if (players.length < 2) {
      console.log('🔍 Not enough players, waiting...');
      return;
    }

    // Processa resultado
    const [p1, p2] = gameKey.split('-');
    const p1Choice = roundChoices[p1]?.choice;
    const p2Choice = roundChoices[p2]?.choice;
    
    console.log('🔍 Choices:', { p1, p1Choice, p2, p2Choice });
    
    if (p1Choice && p2Choice) {
      console.log('🎯 Both players chose! Processing result...');
      
      const roundData = {
        round: parseInt(roundNum),
        p1Choice,
        p2Choice,
        p1Points: null,
        p2Points: null,
        resolved: false
      };
      
      const resolvedRound = resolveRound(roundData);
      console.log('🎯 Round resolved:', resolvedRound);
      
      // Salva resultado
      this.gameRepo.processRoundResult(gameKey, roundNum, {
        player1Choice: p1Choice,
        player2Choice: p2Choice,
        player1Points: resolvedRound.p1Points,
        player2Points: resolvedRound.p2Points
      });
      
      console.log('🎯 Result saved to Firebase!');
    } else {
      console.log('🔍 Missing choices, waiting...');
    }
  }

  // Para de escutar jogo
  stopListening(gameKey) {
    this.gameRepo.stopListening(gameKey);
  }
}

export default GameService;