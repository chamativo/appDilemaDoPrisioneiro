// Traduções para português
export const TRANSLATIONS = {
  // Escolhas do jogo
  'cooperate': 'Cooperar',
  'defect': 'Trair',
  
  // Estados da UI
  'Cooperar': 'Cooperar',
  'Trair': 'Trair',
  
  // Textos de interface
  'Choose': 'Escolha',
  'Waiting': 'Aguardando',
  'Result': 'Resultado',
  'Final': 'Final'
};

// Função para traduzir termo
export function translate(term) {
  return TRANSLATIONS[term] || term;
}

// Função para traduzir escolha específica
export function translateChoice(choice) {
  if (choice === 'cooperate') return 'Cooperar';
  if (choice === 'defect') return 'Trair';
  return choice;
}