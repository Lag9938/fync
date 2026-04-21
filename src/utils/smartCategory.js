const KEYWORD_MAPPING = {
  'ifood': 'Alimentação',
  'uber': 'Transporte',
  '99app': 'Transporte',
  'mercado livre': 'Compras',
  'amazon': 'Compras',
  'kabum': 'Compras',
  'magalu': 'Compras',
  'shopee': 'Compras',
  'aliexpress': 'Compras',
  'netflix': 'Lazer',
  'spotify': 'Lazer',
  'steam': 'Lazer',
  'riot games': 'Lazer',
  'playstatn': 'Lazer',
  'disney': 'Lazer',
  'youtube': 'Lazer',
  'posto': 'Transporte',
  'gasolina': 'Transporte',
  'supermercado': 'Alimentação',
  'mercado': 'Alimentação',
  'padaria': 'Alimentação',
  'restaurante': 'Alimentação',
  'farmacia': 'Saúde',
  'drogaria': 'Saúde',
  'medico': 'Saúde',
  'hospital': 'Saúde',
  'aluguel': 'Moradia',
  'condominio': 'Moradia',
  'luz': 'Moradia',
  'energia': 'Moradia',
  'agua': 'Moradia',
  'internet': 'Moradia',
  'airbnb': 'Lazer',
  'hbo': 'Lazer',
  'paramount': 'Lazer',
  'prime video': 'Lazer',
  'ingresso.com': 'Lazer',
  'itau': 'Outros',
  'bradesco': 'Outros',
  'santander': 'Outros',
  'pagseguro': 'Outros',
  'picpay': 'Outros',
};

/**
 * Prediz a categoria de um lançamento com base no histórico de transações e regras locais.
 * @param {string} title - O título/descrição do lançamento atual.
 * @param {Array} history - O array de transações existentes.
 * @returns {string|null} - A categoria sugerida ou null.
 */
export function predictCategory(title, history) {
  if (!title) return null;

  const cleanTitle = title.trim().toLowerCase();
  if (cleanTitle.length < 3) return null;

  // 1. Regra de Ouro: Histórico Exato
  if (history && history.length > 0) {
    const match = history.find(t => t.title && t.title.trim().toLowerCase() === cleanTitle);
    if (match) return match.category;
  }

  // 2. Base de Conhecimento Local (Keywords)
  for (const [key, category] of Object.entries(KEYWORD_MAPPING)) {
    if (cleanTitle.includes(key)) return category;
  }

  // 3. Fallback: Histórico Parcial
  if (history && history.length > 0) {
    const partialMatch = history.find(t => 
      t.title && t.title.trim().toLowerCase().includes(cleanTitle)
    );
    if (partialMatch) return partialMatch.category;
  }

  return null;
}
