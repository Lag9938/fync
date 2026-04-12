// REPLACE parseB3Excel function - lines 1908-1971
const newFunc = `  const parseB3Excel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        
        let mapped = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // Find header row dynamically (B3 files have metadata rows before the table)
          const B3_KEYWORDS = ['data', 'movimenta', 'produto', 'ticker', 'codigo', 'quantidade', 'valor'];
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
            const clean = rawRows[i].join(' ').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
            const hits = B3_KEYWORDS.filter(kw => clean.includes(kw));
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

          const iDate   = colIdx('data', 'date');
          const iMov    = colIdx('movimenta', 'tipo', 'entrada');
          const iTicker = colIdx('codigo de negociacao', 'ticker', 'codigo', 'produto', 'ativo');
          const iQty    = colIdx('quantidade', 'qtd');
          const iPrice  = colIdx('preco', 'cotacao', 'unit');
          const iTotal  = colIdx('valor total', 'montante', 'financeiro', 'valor');

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.every(c => c === '' || c == null)) continue;

            const rawDate = iDate >= 0 ? row[iDate] : '';
            const movType = String(iMov >= 0 ? row[iMov] || '' : '');
            const rawTicker = String(iTicker >= 0 ? row[iTicker] || '' : '');
            const quantity = parseFloat(String(iQty >= 0 ? row[iQty] : '1').replace(',', '.')) || 1;
            const price    = parseFloat(String(iPrice >= 0 ? row[iPrice] : '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            let   total    = parseFloat(String(iTotal >= 0 ? row[iTotal] : '0').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
            if (!total && price) total = price * quantity;

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
                } else { dateStr = String(rawDate); }
              }
            }

            const ticker = rawTicker.toUpperCase().replace(/FII/i,'').trim();
            const ml = movType.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
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
          alert('Nenhuma movimentacao detectada.\\n\\nUse o extrato de Movimentacoes da B3/CEI com as colunas: Data, Produto/Ticker, Movimentacao, Quantidade e Valor.');
          setB3Preview(null);
        } else {
          setB3Preview({ rows: mapped });
        }
      } catch(err) {
        alert('Erro ao ler o arquivo. Verifique se e um .xlsx valido.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };`;
console.log(newFunc.split('\n').length, 'lines');
