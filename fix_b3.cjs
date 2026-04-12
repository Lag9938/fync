const fs = require('fs');
let src = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

const oldFn = `  const parseB3Excel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Try to detect columns from the B3 format
        const mapped = rows.map(row => {
          // B3 XLSX usually has columns like: Data, Movimentação, Produto, Ticker, Quantidade, Preco, Valor
          const keys = Object.keys(row);
          const findVal = (...candidates) => {
            for (const c of candidates) {
              const k = keys.find(k => k.toString().toLowerCase().includes(c.toLowerCase()));
              if (k && row[k] !== '') return row[k];
            }
            return '';
          };

          const rawDate = findVal('data', 'date', 'Data da Neg');
          const movType  = findVal('movimenta', 'opera', 'tipo', 'mov');
          const ticker   = findVal('ticker', 'código', 'codigo', 'produto', 'ativo');
          const quantity = parseFloat(String(findVal('qtd', 'quantidade', 'quant', 'units')).replace(',', '.')) || 1;
          const price    = parseFloat(String(findVal('preco', 'preço', 'unit', 'cotacao')).replace(',', '.').replace('R$','')) || 0;
          const total    = parseFloat(String(findVal('valor total', 'valor', 'montante', 'financeiro')).replace(',', '.').replace('R$','')) || (price * quantity);

          // Determine if it is a buy or receive
          const movLower = String(movType).toLowerCase();
          const isBuy = movLower.includes('compra') || movLower.includes('subscri') || movLower.includes('aquisicao') || movLower.includes('aquisição');
          const isSell = movLower.includes('venda') || movLower.includes('aliena');
          const isDividend = movLower.includes('dividend') || movLower.includes('jcp') || movLower.includes('rendimento') || movLower.includes('provento');

          // Parse date
          let dateStr = '';
          if (rawDate instanceof Date) {
            dateStr = rawDate.toISOString().split('T')[0];
          } else {
            const parts = String(rawDate).split('/');
            if (parts.length === 3) dateStr = \`\${parts[2]}-\${parts[1].padStart(2,'0')}-\${parts[0].padStart(2,'0')}\`;
            else dateStr = rawDate;
          }

          return {
            date: dateStr,
            ticker: String(ticker).toUpperCase().trim(),
            movType: movType,
            quantity,
            price,
            total: Math.abs(total),
            type: isDividend ? 'income' : isSell ? 'income' : 'expense',
            label: isDividend ? 'Dividendo/JCP' : isBuy ? 'Compra' : isSell ? 'Venda' : movType,
            valid: !!(dateStr && ticker && Math.abs(total) > 0)
          };
        }).filter(r => r.valid && r.ticker);

        setB3Preview({ rows: mapped });
      } catch(err) {
        alert('Erro ao ler o arquivo. Verifique o formato B3.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };`;

const newFn = `  const parseB3Excel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        let mapped = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          // Read as raw array-of-arrays so we control header detection
          const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // Scan first 25 rows to find header row (B3 files have metadata before data)
          const B3_KEYWORDS = ['data', 'movimenta', 'produto', 'ticker', 'codigo', 'quantidade', 'valor'];
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
            const rowClean = rawRows[i].join(' ').toLowerCase()
              .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            const hits = B3_KEYWORDS.filter(kw => rowClean.includes(kw));
            if (hits.length >= 2) { headerRowIdx = i; break; }
          }
          if (headerRowIdx === -1) continue;

          const headers = rawRows[headerRowIdx].map(h =>
            String(h).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim()
          );
          const colIdx = (...cands) => {
            for (const c of cands) {
              const idx = headers.findIndex(h => h.includes(c));
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const iDate   = colIdx('data');
          const iMov    = colIdx('movimenta', 'tipo', 'entrada');
          const iTicker = colIdx('codigo de negociacao', 'ticker', 'codigo', 'produto', 'ativo');
          const iQty    = colIdx('quantidade', 'qtd');
          const iPrice  = colIdx('preco', 'cotacao', 'unit');
          const iTotal  = colIdx('valor de operacao', 'valor total', 'montante', 'financeiro', 'valor');

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.every(c => c === '' || c == null)) continue;

            const rawDate   = iDate   >= 0 ? row[iDate]   : '';
            const movType   = String(iMov    >= 0 ? row[iMov]    || '' : '');
            const rawTicker = String(iTicker >= 0 ? row[iTicker] || '' : '');
            const rawQty    = String(iQty    >= 0 ? row[iQty]    || '1' : '1');
            const rawPrice  = String(iPrice  >= 0 ? row[iPrice]  || '0' : '0');
            const rawTotal  = String(iTotal  >= 0 ? row[iTotal]  || '0' : '0');

            const quantity = parseFloat(rawQty.replace(',', '.')) || 1;
            const price    = parseFloat(rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            let   total    = parseFloat(rawTotal.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
            if (!total && price) total = price * quantity;

            // Parse the date
            let dateStr = '';
            if (rawDate instanceof Date) {
              dateStr = rawDate.toISOString().split('T')[0];
            } else {
              const parts = String(rawDate).split('/');
              if (parts.length === 3) {
                const y = parts[2].length === 2 ? \`20\${parts[2]}\` : parts[2];
                dateStr = \`\${y}-\${parts[1].padStart(2,'0')}-\${parts[0].padStart(2,'0')}\`;
              } else {
                const num = Number(rawDate);
                if (!isNaN(num) && num > 40000) {
                  const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                  dateStr = d.toISOString().split('T')[0];
                } else {
                  dateStr = String(rawDate);
                }
              }
            }

            const ticker = rawTicker.toUpperCase().trim();
            const ml = movType.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            const isDividend = ml.includes('dividend') || ml.includes('jcp') || ml.includes('rendimento') || ml.includes('provento') || ml.includes('amortizac');
            const isSell     = ml.includes('venda') || ml.includes('aliena');
            const isBuy      = ml.includes('compra') || ml.includes('subscri') || ml.includes('aquisicao');

            if (!dateStr.match(/\\d{4}-\\d{2}-\\d{2}/) || !ticker || Math.abs(total) === 0) continue;

            mapped.push({
              date: dateStr, ticker, movType, quantity, price,
              total: Math.abs(total),
              type: isDividend ? 'income' : isSell ? 'income' : 'expense',
              label: isDividend ? 'Dividendo/JCP' : isBuy ? 'Compra' : isSell ? 'Venda' : (movType || 'Movimentacao'),
            });
          }
          if (mapped.length > 0) break;
        }

        if (mapped.length === 0) {
          alert('Nenhuma movimentacao detectada.\\n\\nDica: Use o extrato de "Movimentacoes" da B3/CEI com colunas: Data, Produto/Ticker, Movimentacao, Quantidade e Valor.');
          setB3Preview(null);
        } else {
          setB3Preview({ rows: mapped });
        }
      } catch(err) {
        alert('Erro ao ler o arquivo. Verifique se e um .xlsx valido da B3.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };`;

if (!src.includes(oldFn)) {
  console.error('OLD function not found exactly — check whitespace');
  process.exit(1);
}
src = src.replace(oldFn, newFn);
fs.writeFileSync('src/pages/Dashboard.jsx', src);
console.log('Done!');
