export const parseOFX = (ofxString) => {
  const transactions = [];

  const parseDate = (raw) => {
    if (!raw) return new Date().toISOString();
    const s = raw.trim();
    const year  = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day   = s.substring(6, 8);
    return `${year}-${month}-${day}T12:00:00.000Z`;
  };

  const getTag = (block, tag) => {
    const re = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const m = block.match(re);
    return m ? m[1].trim() : null;
  };

  const cleanTitle = (str) => {
    if (!str) return '';
    return str
      .replace(/^Cartão\s+de\s+Crédito\s*-\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const processBlock = (block) => {
    const dateRaw  = getTag(block, 'DTPOSTED');
    const amtRaw   = getTag(block, 'TRNAMT');
    const memo     = getTag(block, 'MEMO');
    const name     = getTag(block, 'NAME');
    const trntype  = getTag(block, 'TRNTYPE');

    const rawAmt = parseFloat((amtRaw || '0').replace(',', '.'));
    let amount = Math.abs(rawAmt);
    let type = rawAmt >= 0 ? 'income' : 'expense';

    if (trntype === 'DEBIT' || trntype === 'CHECK' || trntype === 'PAYMENT') type = 'expense';
    if (trntype === 'CREDIT' || trntype === 'DEP' || trntype === 'XFER') type = 'income';

    let title = cleanTitle(name);
    let description = memo || '';

    // Lógica para Bancos que deixam NAME vazio ou genérico (ex: Nubank)
    if (!title || title.toLowerCase().includes('transação') || title.length < 3) {
      if (description) {
        title = cleanTitle(description);
        description = '';
      } else {
        title = 'Transação Importada';
      }
    }

    if (description === title) description = '';
    if (amount === 0) return null;

    return {
      title,
      description,
      amount,
      type,
      category: 'Outros',
      date: parseDate(dateRaw),
    };
  };

  // SGML style
  const sgmlBlocks = ofxString.split(/<STMTTRN>/i);
  if (sgmlBlocks.length > 1) {
    for (let i = 1; i < sgmlBlocks.length; i++) {
      const tx = processBlock(sgmlBlocks[i]);
      if (tx) transactions.push(tx);
    }
  } else {
    // XML style
    const xmlRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    while ((match = xmlRegex.exec(ofxString)) !== null) {
      const tx = processBlock(match[1]);
      if (tx) transactions.push(tx);
    }
  }

  return transactions;
};
