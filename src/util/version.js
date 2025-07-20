// Versão do sistema conforme especificação
export const VERSION = {
  number: 'v2024.020',
  description: 'Correct architecture: gameService as referee, uiRouter as screen controller'
};

// Exibe versão no console
export function displayVersion() {
  console.log(`${VERSION.number} - ${VERSION.description}`);
}

// Atualiza elemento HTML com versão
export function updateVersionDisplay(elementId = 'version-display') {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = VERSION.number;
  }
}