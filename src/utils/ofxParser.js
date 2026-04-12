export const parseOFX = (ofxString) => {
  const transactions = [];

  // Muitos bancos brasileiros usam SGML (sem </STMTTRN>) e outros usam XML
  // Vamos suportar os dois formatos

  const parseDate = (raw) => {
    if (!raw) return new Date().toISOString();
    const s = raw.trim();
    // Formato: YYYYMMDDHHMMSS[timezone] or YYYYMMDD
    const year  = s.substring(0, 4);
    const month = s.substring(4, 6);
    const day   = s.substring(6, 8);
    return `${year}-${month}-${day}T12:00:00.000Z`;
  };

  const getTag = (block, tag) => {
    // Tenta capturar tag com e sem fechamento
    const re = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const m = block.match(re);
    return m ? m[1].trim() : null;
  };

  // Tentativa 1: split por <STMTTRN> simples (SGML — Itaú, BB, Caixa, Bradesco)
  const sgmlBlocks = ofxString.split(/<STMTTRN>/i);
  if (sgmlBlocks.length > 1) {
    // primeiro elemento é o header, ignore
    for (let i = 1; i < sgmlBlocks.length; i++) {
      const block = sgmlBlocks[i];

      const dateRaw  = getTag(block, 'DTPOSTED');
      const amtRaw   = getTag(block, 'TRNAMT');
      const memo     = getTag(block, 'MEMO');
      const name     = getTag(block, 'NAME');
      const trntype  = getTag(block, 'TRNTYPE');

      const rawAmt = parseFloat((amtRaw || '0').replace(',', '.'));
      let amount = Math.abs(rawAmt);
      let type = rawAmt >= 0 ? 'income' : 'expense';

      // Alguns bancos usam TRNTYPE para indicar o tipo
      if (trntype === 'DEBIT' || trntype === 'CHECK' || trntype === 'PAYMENT') type = 'expense';
      if (trntype === 'CREDIT' || trntype === 'DEP' || trntype === 'XFER') type = 'income';

      let title = name || 'Transação Importada';
      let description = memo || '';

      // Se o banco repete name no memo, não precisa duplicar
      if (description === title) description = '';

      title = title.replace(/^Cartão\s+de\s+Crédito\s*-\s*/gi, '');

      if (amount === 0) continue; // ignora linhas zeradas

      transactions.push({
        title,
        description,
        amount,
        type,
        category: 'Outros',
        date: parseDate(dateRaw),
      });
    }
  } else {
    // Tentativa 2: XML com </STMTTRN> (Nubank, Inter, alguns Itaú modernos)
    const xmlRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    while ((match = xmlRegex.exec(ofxString)) !== null) {
      const block = match[1];

      const dateRaw = getTag(block, 'DTPOSTED');
      const amtRaw  = getTag(block, 'TRNAMT');
      const memo    = getTag(block, 'MEMO');
      const name    = getTag(block, 'NAME');

      const rawAmt = parseFloat((amtRaw || '0').replace(',', '.'));
      let amount = Math.abs(rawAmt);
      let type = rawAmt >= 0 ? 'income' : 'expense';

      let title = name || 'Transação Importada';
      let description = memo || '';
      
      if (description === title) description = '';

      if (amount === 0) continue;

      transactions.push({
        title,
        description,
        amount,
        type,
        category: 'Outros',
        date: parseDate(dateRaw),
      });
    }
  }

  return transactions;
};
