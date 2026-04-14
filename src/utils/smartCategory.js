/**
 * Prediz a categoria de um lançamento com base no histórico de transações.
 * @param {string} title - O título/descrição do lançamento atual.
 * @param {Array} history - O array de transações existentes.
 * @returns {string|null} - A categoria sugerida ou null.
 */
export function predictCategory(title, history) {
  if (!title || !history || history.length === 0) return null;

  const cleanTitle = title.trim().toLowerCase();
  if (cleanTitle.length < 3) return null;

  // Busca a transação mais recente com o mesmo título
  // O histórico geralmente já vem ordenado por data descendente, 
  // mas vamos garantir pegando o primeiro match.
  const match = history.find(t => t.title && t.title.trim().toLowerCase() === cleanTitle);

  if (match) {
    return match.category;
  }

  // Fallback: Busca parcial (contém o texto)
  const partialMatch = history.find(t => 
    t.title && t.title.trim().toLowerCase().includes(cleanTitle)
  );

  return partialMatch ? partialMatch.category : null;
}
