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

  // ÁRBITRO: Verifica se rodada está completa e processa
  checkAndProcessRound(gameKey, roundNum, roundChoices, existingResults) {
    console.log('🏁 ÁRBITRO: Verificando rodada', gameKey, roundNum);
    
    // Se já processada, verifica se deve avançar para próxima rodada
    if (existingResults && existingResults[roundNum]) {
      console.log('🏁 ÁRBITRO: Rodada já processada, verificando se deve avançar...');
      this.arbitrateNextStep(gameKey, parseInt(roundNum));
      return;
    }

    // Verifica se ambos jogadores escolheram
    const players = Object.keys(roundChoices);
    console.log('🏁 ÁRBITRO: Jogadores que escolheram:', players);
    
    if (players.length < 2) {
      console.log('🏁 ÁRBITRO: Aguardando mais jogadores...');
      return;
    }

    // ÁRBITRO: Processa resultado
    const [p1, p2] = gameKey.split('-');
    const p1Choice = roundChoices[p1]?.choice;
    const p2Choice = roundChoices[p2]?.choice;
    
    console.log('🏁 ÁRBITRO: Escolhas confirmadas:', { p1, p1Choice, p2, p2Choice });
    
    if (p1Choice && p2Choice) {
      console.log('🏁 ÁRBITRO: Processando resultado da rodada...');
      
      const roundData = {
        round: parseInt(roundNum),
        p1Choice,
        p2Choice,
        p1Points: null,
        p2Points: null,
        resolved: false
      };
      
      const resolvedRound = resolveRound(roundData);
      console.log('🏁 ÁRBITRO: Resultado calculado:', resolvedRound);
      
      // Salva resultado no Firebase
      this.gameRepo.processRoundResult(gameKey, roundNum, {
        player1Choice: p1Choice,
        player2Choice: p2Choice,
        player1Points: resolvedRound.p1Points,
        player2Points: resolvedRound.p2Points
      });
      
      // ÁRBITRO: COMANDA UI PARA MOSTRAR RESULTADO
      console.log('🏁 ÁRBITRO: Comandando UI para mostrar resultado');
      eventBus.emit('showGameResult', {
        gameKey,
        result: {
          player1Choice: p1Choice,
          player2Choice: p2Choice,
          player1Points: resolvedRound.p1Points,
          player2Points: resolvedRound.p2Points
        }
      });
      
      // ÁRBITRO: Agenda próxima rodada após delay
      setTimeout(() => {
        this.arbitrateNextStep(gameKey, parseInt(roundNum));
      }, 3000); // 3 segundos para ver resultado
      
    } else {
      console.log('🏁 ÁRBITRO: Escolhas incompletas');
    }
  }
  
  // ÁRBITRO: Decide próximo passo do jogo
  arbitrateNextStep(gameKey, currentRound) {
    console.log('🏁 ÁRBITRO: Decidindo próximo passo...', gameKey, currentRound);
    
    if (currentRound >= 10) {
      // Jogo terminou
      console.log('🏁 ÁRBITRO: Jogo terminado! Calculando resultado final...');
      this.arbitrateGameComplete(gameKey);
    } else {
      // Próxima rodada
      const nextRound = currentRound + 1;
      console.log('🏁 ÁRBITRO: Iniciando rodada', nextRound);
      
      eventBus.emit('startNextRound', {
        gameKey,
        round: nextRound
      });
    }
  }
  
  // ÁRBITRO: Finaliza jogo
  arbitrateGameComplete(gameKey) {
    // TODO: Calcular scores finais e comandar UI
    console.log('🏁 ÁRBITRO: Finalizando jogo', gameKey);
    
    eventBus.emit('showGameComplete', {
      gameKey,
      scores: { 'Arthur': 0, 'Laura': 5 } // Placeholder
    });
  }

  // Para de escutar jogo
  stopListening(gameKey) {
    this.gameRepo.stopListening(gameKey);
  }
}

export default GameService;