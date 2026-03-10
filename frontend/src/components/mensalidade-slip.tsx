"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ConfiguracaoFinanceira } from "@/services/taxa-service";

interface MensalidadeItem {
  nome: string;
  valor: number;
  obrigatorio: boolean;
  selecionado: boolean;
}

interface TaxaExtra {
  descricao: string;
  valor_total: number;
  parcela_atual: number;
  total_parcelas: number;
  valor_parcela: number;
}

interface MensalidadeSlipProps {
  socioName: string;
  mesReferencia: string;
  valorBase: number;
  dataVencimento: string;
  itens: MensalidadeItem[];
  taxaExtra?: TaxaExtra[];
  valorTotal: number;
  status?: string;
  config?: ConfiguracaoFinanceira | null;
  isAdmin?: boolean;
}

export function MensalidadeSlip({
  socioName,
  mesReferencia,
  valorBase,
  dataVencimento,
  itens,
  taxaExtra,
  valorTotal,
  status,
  hidePix = false,
}: MensalidadeSlipProps & { hidePix?: boolean }) {
  const [copied, setCopied] = useState(false);
  const pixKey = "28.227.134/0001-69";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAGO":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "PENDENTE":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      case "ATRASADO":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "INADIMPLENTE":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "EM ACORDO":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "SUJEITO A PENA SOCIAL":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800 font-bold";
      case "PENA SOCIAL":
        return "bg-red-950 text-red-200 dark:bg-red-950/50 dark:text-red-200 border-red-900 font-black animate-pulse";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    // Handle YYYY-MM-DD specifically to avoid UTC timezone shifts
    if (dateStr.includes("-")) {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
      }
    }
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card className="max-w-2xl mx-auto border-dashed shadow-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <span className="font-bold text-primary text-xs">UDV</span>
        </div>
        <CardTitle className="text-lg uppercase tracking-wider">
          Centro Espírita Beneficente União do Vegetal
        </CardTitle>
        <p className="text-sm text-muted-foreground uppercase font-medium">
          Demonstrativo de Mensalidade
        </p>
        {status && (
          <Badge
            variant="outline"
            className={`mx-auto mt-2 w-fit ${getStatusColor(status)}`}
          >
            {status}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase font-bold">
              Sócio
            </p>
            <p className="font-medium text-base truncate" title={socioName}>
              {socioName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs uppercase font-bold">
              Mês de Referência
            </p>
            <p className="font-medium text-base">{mesReferencia}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          {/* Base Value */}
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Mensalidade Base</span>
            <span className="font-mono">{formatCurrency(valorBase)}</span>
          </div>

          <Separator className="my-2 opacity-50" />

          {itens.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-sm text-muted-foreground pt-2"
            >
              <span>
                {item.nome}{" "}
                {item.obrigatorio && (
                  <span className="text-[10px] bg-secondary px-1 py-0.5 rounded ml-1">
                    OBRIGATÓRIO
                  </span>
                )}
              </span>
              <span
                className={
                  item.selecionado
                    ? "text-foreground font-mono"
                    : "line-through opacity-50 font-mono"
                }
              >
                {formatCurrency(item.valor)}
              </span>
            </div>
          ))}

          {taxaExtra?.map((taxa, idx) => (
            <div
              key={`extra-${idx}`}
              className="flex justify-between items-center text-sm pt-1"
            >
              <span className="text-amber-600 dark:text-amber-500 font-medium flex items-center gap-2">
                Taxa Extra: {taxa.descricao}
                <span className="text-xs bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-full">
                  {taxa.parcela_atual}/{taxa.total_parcelas}
                </span>
              </span>
              <span className="font-mono text-amber-600 dark:text-amber-500">
                {formatCurrency(taxa.valor_parcela)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between items-end bg-secondary/20 p-4 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
              Total a Pagar
            </p>
            <div className="text-3xl font-bold tracking-tight text-primary">
              {formatCurrency(valorTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vencimento: {formatDate(dataVencimento)}
            </p>
          </div>
        </div>
      </CardContent>

      {!hidePix && (
        <CardFooter className="flex-col space-y-4 pt-2 pb-6 bg-muted/30">
          <div className="w-full">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-2 text-center">
              Pagamento via Pix
            </p>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-background border px-3 py-2 rounded-md font-mono text-sm text-center truncate select-all">
                {pixKey}
              </div>
              <Button size="icon" variant="outline" onClick={handleCopyPix}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Copie a chave acima e utilize o pagamento via CNPJ.
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
