// FUNÇÃO PURA EXATA DA ESPECIFICAÇÃO
export function scoreChoices(c1, c2) {
  if (c1 === 'cooperate' && c2 === 'cooperate') return [3, 3];
  if (c1 === 'cooperate' && c2 === 'defect') return [0, 5];
  if (c1 === 'defect' && c2 === 'cooperate') return [5, 0];
  return [1, 1];
}