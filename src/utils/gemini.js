const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;

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
- Saldo total em carteiras: R$ ${Number(totalBalance || 0).toFixed(2)}
- Receitas no período: R$ ${Number(totalIncome || 0).toFixed(2)}
- Despesas no período: R$ ${Number(totalExpenses || 0).toFixed(2)}
- Saldo do período: R$ ${(Number(totalIncome || 0) - Number(totalExpenses || 0)).toFixed(2)}

TOP CATEGORIAS DE GASTOS:
${topCategories.map((c, i) => `${i + 1}. ${c.name}: R$ ${Number(c.total || 0).toFixed(2)}`).join('\n') || 'Nenhum dado disponível'}

METAS DE ECONOMIA ATIVAS:
${activeGoals.map(g => `- ${g.title}: R$ ${Number(g.currentAmount || 0).toFixed(2)} / R$ ${Number(g.targetAmount || 0).toFixed(2)} (${g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(0) : 0}%)`).join('\n') || 'Nenhuma meta cadastrada'}

ASSINATURAS ATIVAS:
${activeSubscriptions.map(s => `- ${s.name}: R$ ${Number(s.amount || 0).toFixed(2)}/mês (dia ${s.billingDay})`).join('\n') || 'Nenhuma assinatura'}

CARTEIRAS:
${wallets.map(w => `- ${w.name}: R$ ${Number(w.balance || 0).toFixed(2)}`).join('\n') || 'Nenhuma carteira'}

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
    systemInstruction: {
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

const GEMINI_FLASH_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Lê um arquivo PDF (extrato bancário) via IA e retorna as transações.
 * @param {string} base64Pdf - O conteúdo do PDF em base64
 */
export async function extractTransactionsFromPDF(base64Pdf) {
  const prompt = `Você é um assistente financeiro especialista em extrair dados de extratos bancários brasileiros.
Leia o extrato bancário em anexo (PDF) e extraia todas as transações financeiras.

REGRAS ESTritas:
1. Retorne APENAS um JSON válido. Não inclua texto, marcações markdown ou explicações. O JSON deve ser um array de objetos.
2. Cada objeto deve ter exatamente esta estrutura:
{
  "date": "YYYY-MM-DD",
  "title": "Descrição exata da transação",
  "amount": 150.50, // Número positivo, use ponto decimal, sem 'R$'
  "type": "income" // ou "expense"
}
3. Ignore saldos anteriores, resumos de fatura ou textos que não são transações reais.
4. Se o valor for negativo no extrato, classifique como "expense" e deixe o valor positivo.
5. Se não encontrar nenhuma transação, retorne um array vazio: []`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "application/pdf", data: base64Pdf } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    }
  };

  try {
    const response = await fetch(GEMINI_FLASH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('Falha ao processar PDF com a IA');

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) return [];
    
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Erro na extração de PDF (Transações):', err);
    throw new Error('Falha ao extrair dados do PDF.');
  }
}

/**
 * Lê notas de corretagem ou extrato B3 em PDF via IA e retorna as operações de investimento.
 * @param {string} base64Pdf - O conteúdo do PDF em base64
 */
export async function extractInvestmentsFromPDF(base64Pdf) {
  const prompt = `Você é um assistente financeiro especialista em ler notas de corretagem brasileiras (B3).
Leia a nota de corretagem/extrato em anexo (PDF) e extraia todas as transações de compra e venda de ativos.

REGRAS ESTritas:
1. Retorne APENAS um JSON válido. Não inclua marcações markdown ou explicações. O JSON deve ser um array de objetos.
2. Cada objeto deve ter exatamente esta estrutura:
{
  "date": "YYYY-MM-DD",
  "ticker": "PETR4", // Código do ativo com até 5 a 6 letras (ex: VALE3, BOVA11)
  "type": "buy", // "buy" para compra (C), "sell" para venda (V)
  "quantity": 100, // Quantidade inteira
  "price": 35.50 // Preço unitário, use ponto decimal
}
3. Ignore taxas, emolumentos, IRRF e resumos. Extraia apenas as linhas de negociação dos ativos.
4. Se não encontrar nenhuma transação de ativo, retorne um array vazio: []`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "application/pdf", data: base64Pdf } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    }
  };

  try {
    const response = await fetch(GEMINI_FLASH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error('Falha ao processar PDF de investimentos com a IA');

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) return [];
    
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Erro na extração de PDF (Investimentos):', err);
    throw new Error('Falha ao extrair investimentos do PDF.');
  }
}
