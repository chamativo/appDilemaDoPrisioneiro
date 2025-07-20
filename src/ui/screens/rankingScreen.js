// TELA DE CLASSIFICAÇÃO GERAL conforme especificação
import eventBus from '../../app/eventBus.js';

class RankingScreen {
  constructor() {
    this.element = null;
    this.rankingData = [];
  }

  // Renderiza tela de classificação
  render() {
    return `
      <div id="ranking-screen" class="screen">
        <div class="header">
          <h2>Classificação Geral</h2>
          <button id="back-home-btn" class="secondary-btn">← Voltar</button>
        </div>
        
        <div class="ranking-container">
          <div class="ranking-header">
            <div class="position">Pos.</div>
            <div class="player">Jogador</div>
            <div class="total-points">Pontos Totais</div>
            <div class="games-played">Jogos</div>
          </div>
          
          <div id="ranking-list" class="ranking-list">
            ${this.renderRankingList()}
          </div>
        </div>
        
        <div class="ranking-footer">
          <p>* Pontos somados apenas de jogos completos (10 rodadas)</p>
        </div>
      </div>
    `;
  }

  // Renderiza lista de ranking
  renderRankingList() {
    if (!this.rankingData || this.rankingData.length === 0) {
      return `
        <div class="ranking-item empty">
          <div class="empty-message">Carregando classificação...</div>
        </div>
      `;
    }

    return this.rankingData.map((player, index) => `
      <div class="ranking-item ${index === 0 ? 'first-place' : ''}">
        <div class="position">${index + 1}º</div>
        <div class="player">${player.name}</div>
        <div class="total-points">${player.totalPoints}</div>
        <div class="games-played">(${player.completedGames})</div>
      </div>
    `).join('');
  }

  // Configura event listeners
  setupEvents() {
    // Botão voltar para home
    document.getElementById('back-home-btn').addEventListener('click', () => {
      eventBus.emit('changePlayer');
    });
  }

  // Atualiza dados do ranking
  updateRanking(rankingData) {
    console.log('📊 RankingScreen: Atualizando dados do ranking', rankingData);
    this.rankingData = rankingData;
    
    // Se a tela está visível, atualiza a lista
    const rankingList = document.getElementById('ranking-list');
    if (rankingList) {
      rankingList.innerHTML = this.renderRankingList();
    }
  }

  // Mostra tela
  show(data = {}) {
    this.element = document.getElementById('app');
    this.element.innerHTML = this.render();
    this.setupEvents();
    
    // Se recebeu dados, atualiza
    if (data.ranking) {
      this.updateRanking(data.ranking);
    }
  }

  // Esconde tela
  hide() {
    // Cleanup se necessário
  }
}

export default RankingScreen;