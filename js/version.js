// Sistema de controle de versão
const APP_VERSION = {
    number: "v2024.002",  // Ano.Número sequencial
    buildDate: "2025-01-19",
    branch: "game-controller-refactor",
    description: "Debug diagnostics for pending games issue"
};

// Função para exibir informações da versão
function getVersionInfo() {
    return `${APP_VERSION.number} (${APP_VERSION.buildDate}) - ${APP_VERSION.description}`;
}

// Log da versão no console
console.log(`🏷️ Dilema do Prisioneiro ${getVersionInfo()}`);