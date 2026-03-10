import { formatCurrency } from "@/lib/utils";
import React from "react";
import Barcode from "react-barcode";

interface BoletoProps {
  banco?: string;
  codigoBanco?: string;
  linhaDigitavel?: string;
  vencimento: string;
  agenciaCodigo?: string;
  nossoNumero?: string;
  valor: number;
  pagador: {
    nome: string;
    documento?: string; // CPF/CNPJ
    endereco?: string;
  };
  beneficiario: {
    nome: string;
    documento: string; // CNPJ
    endereco: string;
  };
  instrucoes?: string[];
  dataProcessamento?: string;
  dataDocumento?: string;
  especieDoc?: string;
  aceite?: string;
  carteira?: string;
  quantidade?: string;
}

// Helper to calculate a fake checksum or just dummy
const generateFakeLinhaDigitavel = () => {
  return "23790.12345 60000.123456 70000.123456 1 12340000000000";
};

export function BoletoView({
  banco = "Banco do Brasil",
  codigoBanco = "001-9",
  linhaDigitavel = generateFakeLinhaDigitavel(),
  vencimento,
  agenciaCodigo = "1234-5 / 0012345-6",
  nossoNumero = "1234567890",
  valor,
  pagador,
  beneficiario,
  instrucoes = [
    "Sr. Caixa, cobrar juros de R$ 0,33 ao dia após o vencimento.",
    "Não receber após 30 dias do vencimento.",
  ],
  dataProcessamento = new Date().toLocaleDateString("pt-BR"),
  dataDocumento = new Date().toLocaleDateString("pt-BR"),
  especieDoc = "DM",
  aceite = "N",
  carteira = "17",
  quantidade = "",
}: BoletoProps) {
  return (
    <div className="font-sans text-xs bg-white text-black print:w-full print:p-0 p-4 border rounded-sm print:border-0 max-w-[800px] mx-auto">
      {/* Header Cut Line */}
      <div className="border-b-2 border-dashed border-gray-400 mb-8 pb-2 text-right text-[10px] uppercase">
        Recibo do Pagador
      </div>

      {/* Top Section (Recibo do Pagador) */}
      <div className="grid grid-cols-12 border-b border-black pb-4 mb-4">
        <div className="col-span-3 border-r border-black pr-2">
          <div className="flex items-center gap-2">
            {/* Dummy Logo with Name */}
            <div className="flex flex-col">
              <div className="w-8 h-8 bg-gray-200 flex items-center justify-center font-bold text-[10px] border border-gray-400">
                BB
              </div>
              <span className="text-[9px] text-black font-medium font-bold mt-1 uppercase leading-none">
                {banco}
              </span>
            </div>
            <span className="text-xl font-bold ml-auto">{codigoBanco}</span>
          </div>
        </div>
        <div className="col-span-9 pl-4 flex items-end justify-end">
          <div className="text-lg font-mono tracking-widest font-bold">
            {linhaDigitavel}
          </div>
        </div>
      </div>

      {/* Main Table Structure */}
      <div className="border border-black mb-4">
        {/* Row 1 */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Local de Pagamento
            </div>
            <div className="font-bold">
              PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO
            </div>
          </div>
          <div className="w-[180px] bg-gray-100 p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Vencimento
            </div>
            <div className="font-bold text-right text-sm">{vencimento}</div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Beneficiário
            </div>
            <div className="font-bold">{beneficiario.nome}</div>
            <div className="text-[9px] text-black font-medium">
              {beneficiario.endereco}
            </div>
          </div>
          <div className="w-[180px] p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Agência / Código Beneficiário
            </div>
            <div className="text-right">{agenciaCodigo}</div>
          </div>
        </div>

        {/* Row 3 */}
        <div className="flex border-b border-black">
          <div className="w-[100px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Data Documento
            </div>
            <div className="text-center">{dataDocumento}</div>
          </div>
          <div className="w-[100px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Nº Documento
            </div>
            <div className="text-center">{nossoNumero}</div>
          </div>
          <div className="w-[60px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Espécie Doc.
            </div>
            <div className="text-center">{especieDoc}</div>
          </div>
          <div className="w-[40px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Aceite
            </div>
            <div className="text-center">{aceite}</div>
          </div>
          <div className="w-[100px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Data Processamento
            </div>
            <div className="text-center">{dataProcessamento}</div>
          </div>
          <div className="flex-1 border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Carteira
            </div>
            <div className="text-center">{carteira}</div>
          </div>
          <div className="w-[180px] p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Nosso Número
            </div>
            <div className="text-right">{nossoNumero}</div>
          </div>
        </div>

        {/* Row 4 */}
        <div className="flex border-b border-black">
          <div className="flex-1 border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Uso do Banco
            </div>
            <div className="text-center">{quantidade}</div>
          </div>
          <div className="w-[100px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Carteira
            </div>
            <div className="text-center">{carteira}</div>
          </div>

          <div className="w-[60px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Espécie
            </div>
            <div className="text-center">R$</div>
          </div>
          <div className="w-[100px] border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              Quantidade
            </div>
            <div className="text-center"></div>
          </div>
          <div className="w-flex-1 border-r border-black p-1 min-w-[100px]">
            <div className="text-[9px] text-black font-medium uppercase">
              Valor
            </div>
            <div className="text-center"></div>
          </div>
          <div className="w-[180px] bg-gray-100 p-1">
            <div className="text-[9px] text-black font-medium uppercase">
              (=) Valor do Documento
            </div>
            <div className="text-right font-bold">{formatCurrency(valor)}</div>
          </div>
        </div>

        {/* Row 5 - Instructions */}
        <div className="flex border-b border-black min-h-[120px]">
          <div className="flex-1 border-r border-black p-1">
            <div className="text-[9px] text-black font-medium uppercase mb-1">
              Instruções (Texto de Responsabilidade do Beneficiário)
            </div>
            <ul className="list-none space-y-1">
              {instrucoes.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>
          </div>
          <div className="w-[180px] flex flex-col">
            <div className="flex-1 border-b border-black p-1">
              <div className="text-[9px] text-black font-medium uppercase">
                (-) Desconto / Abatimento
              </div>
            </div>
            <div className="flex-1 border-b border-black p-1">
              <div className="text-[9px] text-black font-medium uppercase">
                (-) Outras Deduções
              </div>
            </div>
            <div className="flex-1 border-b border-black p-1">
              <div className="text-[9px] text-black font-medium uppercase">
                (+) Mora / Multa
              </div>
            </div>
            <div className="flex-1 border-b border-black p-1">
              <div className="text-[9px] text-black font-medium uppercase">
                (+) Outros Acréscimos
              </div>
            </div>
            <div className="flex-1 p-1 bg-gray-100">
              <div className="text-[9px] text-black font-medium uppercase">
                (=) Valor Cobrado
              </div>
            </div>
          </div>
        </div>

        {/* Row 6 - Pagador */}
        <div className="p-2">
          <div className="text-[9px] text-black font-medium uppercase">
            Pagador
          </div>
          <div className="font-bold">{pagador.nome}</div>
          <div className="text-xs">{pagador.endereco}</div>
          <div className="text-xs mt-1">CPF/CNPJ: {pagador.documento}</div>

          <div className="flex justify-end mt-2">
            <div className="text-[9px] text-black font-medium w-[200px]">
              Cód. Baixa
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Section */}
      <div className="mt-4 pt-4 ml-4">
        {/* We use the fake linha digitavel as the barcode value for simulation. 
               In a real app, you'd calculate the strict barcode string (44 chars). */}

        <Barcode
          value={
            linhaDigitavel.replace(/\D/g, "").substring(0, 44) || "00000000000"
          }
          height={50}
          width={1}
          displayValue={false}
        />
      </div>

      <div className="text-right text-[10px] border-t border-dashed border-gray-400 mt-4 pt-1 uppercase">
        Corte na linha pontilhada
      </div>
    </div>
  );
}
