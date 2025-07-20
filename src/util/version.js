// Versão do sistema conforme especificação
export const VERSION = {
  number: 'v2024.047',
  description: 'Fix round continuation logic - Use last completed round instead of current round'
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