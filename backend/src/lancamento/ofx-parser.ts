export interface OfxTransaction {
  trnType?: string;
  dtPosted?: string;
  trnAmt?: number;
  fitId?: string;
  name?: string;
  memo?: string;
}

function getTagValue(block: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}>([^<\r\n]+)`, 'i');
  const match = block.match(regex);
  return match?.[1]?.trim();
}

function normalizeOfxDate(dtPosted?: string): string {
  if (!dtPosted) return '';
  const digits = dtPosted.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return '';
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${year}-${month}-${day}`;
}

export function parseOfxTransactions(content: string): OfxTransaction[] {
  const transactions: OfxTransaction[] = [];
  const stmtRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>)/gi;

  let match: RegExpExecArray | null;
  while ((match = stmtRegex.exec(content)) !== null) {
    const block = match[1] || '';
    const trnAmtRaw = getTagValue(block, 'TRNAMT');
    const trnAmt = trnAmtRaw ? Number(trnAmtRaw.replace(',', '.')) : undefined;

    transactions.push({
      trnType: getTagValue(block, 'TRNTYPE'),
      dtPosted: normalizeOfxDate(getTagValue(block, 'DTPOSTED')),
      trnAmt,
      fitId: getTagValue(block, 'FITID'),
      name: getTagValue(block, 'NAME'),
      memo: getTagValue(block, 'MEMO'),
    });
  }

  return transactions;
}

export function ofxTransactionsToImportRows(transactions: OfxTransaction[]) {
  return transactions
    .filter((tx) => Number.isFinite(tx.trnAmt) && tx.trnAmt !== 0 && tx.dtPosted)
    .map((tx) => {
      const amount = Number(tx.trnAmt);
      const tipo = amount > 0 ? 'RECEITA' : 'DESPESA';
      const descricao = tx.memo || tx.name || `Movimento ${tx.fitId || ''}`.trim();
      const status = tipo === 'RECEITA' ? 'REGISTRADO' : 'RASCUNHO';

      return {
        tipo,
        descricao,
        valor: Math.abs(amount),
        categoria: 'Extrato Bancario',
        observacao: tx.fitId
          ? `OFX ${tx.trnType || ''} - FITID: ${tx.fitId}`.trim()
          : `OFX ${tx.trnType || ''}`.trim(),
        data_movimento: tx.dtPosted,
        status,
      };
    });
}
