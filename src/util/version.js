// Versão do sistema conforme especificação
export const VERSION = {
  number: 'v2024.049',
  description: 'Add general ranking screen with total points and completed games count'
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