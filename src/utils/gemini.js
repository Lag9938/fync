const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Envia uma mensagem para o Gemini com contexto financeiro do usuário.
 * @param {string} userMessage - Mensagem do usuário
 * @param {object} financialContext - Dados financeiros para contexto
 * @param {Array} history - Histórico da conversa
 */
export async function askGemini(userMessage, financialContext = {}, history = []) {
  const {
    totalBalance = 0,
    totalIncome = 0,
    totalExpenses = 0,
    topCategories = [],
    activeGoals = [],
    activeSubscriptions = [],
    wallets = [],
  } = financialContext;

  const systemPrompt = `Você é o Fync AI, um assistente financeiro pessoal inteligente, empático e especialista em finanças pessoais brasileiras.

DADOS FINANCEIROS ATUAIS DO USUÁRIO:
- Saldo total em carteiras: R$ ${totalBalance.toFixed(2)}
- Receitas no período: R$ ${totalIncome.toFixed(2)}
- Despesas no período: R$ ${totalExpenses.toFixed(2)}
- Saldo do período: R$ ${(totalIncome - totalExpenses).toFixed(2)}

TOP CATEGORIAS DE GASTOS:
${topCategories.map((c, i) => `${i + 1}. ${c.name}: R$ ${c.total.toFixed(2)}`).join('\n') || 'Nenhum dado disponível'}

METAS DE ECONOMIA ATIVAS:
${activeGoals.map(g => `- ${g.title}: R$ ${g.currentAmount?.toFixed(2)} / R$ ${g.targetAmount?.toFixed(2)} (${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}%)`).join('\n') || 'Nenhuma meta cadastrada'}

ASSINATURAS ATIVAS:
${activeSubscriptions.map(s => `- ${s.name}: R$ ${s.amount?.toFixed(2)}/mês (dia ${s.billingDay})`).join('\n') || 'Nenhuma assinatura'}

CARTEIRAS:
${wallets.map(w => `- ${w.name}: R$ ${w.balance?.toFixed(2)}`).join('\n') || 'Nenhuma carteira'}

INSTRUÇÕES:
- Responda SEMPRE em português brasileiro de forma amigável, direta e útil
- Use emojis com moderação para tornar a conversa mais agradável
- Seja específico com os dados do usuário, cite números reais quando relevante
- Não invente dados que não foram fornecidos
- Se o usuário fizer perguntas fora de finanças, redirecione gentilmente para o tema financeiro
- Seja construtivo, nunca julgue hábitos financeiros
- Forneça dicas práticas e acionáveis
- Limite suas respostas a 3-4 parágrafos curtos para melhor legibilidade`;

  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    }
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || 'Erro ao conectar com a IA');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar sua pergunta.';
}

/**
 * Categoriza uma lista de transações em lote.
 * @param {Array} transactions - Lista de nomes/descrições de transações
 * @param {Array} categoryNames - Lista de nomes das categorias válidas
 */
export async function batchCategorizeTransactions(transactions, categoryNames) {
  if (!transactions || transactions.length === 0) return [];

  const prompt = `Você é um assistente especializado em categorização bancária brasileira.
Dada uma lista de descrições de transações bancárias, sua tarefa é atribuir a cada uma a categoria mais provável da lista de categorias válidas.

REGRAS:
1. Use APENAS as categorias da lista de categorias válidas fornecida.
2. Seja inteligente: "Uber" ou "99" é Transporte. "Ifood" ou "Restaurante" é Alimentação. "Amazon" ou "Mercado Livre" é Compras.
3. Se realmente não souber, use "Outros".
4. Retorne APENAS um objeto JSON onde a chave é o índice da transação (começando em 0) e o valor é o nome da categoria.

CATEGORIAS VÁLIDAS:
${categoryNames.join(', ')}

LISTA DE TRANSAÇÕES:
${transactions.map((t, i) => `${i}: "${t}"`).join('\n')}

Retorno esperado (exemplo):
{
  "0": "Transporte",
  "1": "Alimentação"
}`;

  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    }
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('Falha na IA');

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(resultText);
  } catch (err) {
    console.error('Erro na categorização por IA:', err);
    return {};
  }
}
