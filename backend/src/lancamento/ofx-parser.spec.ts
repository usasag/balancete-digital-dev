import {
  parseOfxTransactions,
  ofxTransactionsToImportRows,
} from './ofx-parser';

const sampleOfx = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20260301120000[-3:BRT]
            <TRNAMT>120.50
            <FITID>ABC123
            <NAME>PIX RECEBIDO
            <MEMO>MENSALIDADE MARCO
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260302120000[-3:BRT]
            <TRNAMT>-89.90
            <FITID>XYZ789
            <NAME>PAGAMENTO ENERGIA
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`;

describe('ofx parser', () => {
  it('parses OFX transactions with key fields', () => {
    const txs = parseOfxTransactions(sampleOfx);

    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({
      trnType: 'CREDIT',
      dtPosted: '2026-03-01',
      trnAmt: 120.5,
      fitId: 'ABC123',
      memo: 'MENSALIDADE MARCO',
    });
    expect(txs[1]).toMatchObject({
      trnType: 'DEBIT',
      dtPosted: '2026-03-02',
      trnAmt: -89.9,
      fitId: 'XYZ789',
      name: 'PAGAMENTO ENERGIA',
    });
  });

  it('maps parsed transactions to import rows', () => {
    const txs = parseOfxTransactions(sampleOfx);
    const rows = ofxTransactionsToImportRows(txs);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      tipo: 'RECEITA',
      valor: 120.5,
      categoria: 'Extrato Bancario',
      data_movimento: '2026-03-01',
      status: 'REGISTRADO',
    });
    expect(rows[1]).toMatchObject({
      tipo: 'DESPESA',
      valor: 89.9,
      data_movimento: '2026-03-02',
      status: 'RASCUNHO',
    });
  });
});
