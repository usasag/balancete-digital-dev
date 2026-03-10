"use client";

import { Mensalidade } from "@/services/mensalidade-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

interface RelatorioMensalidadesProps {
  data: Mensalidade[];
}

export function RelatorioMensalidades({ data }: RelatorioMensalidadesProps) {
  // 1. Identify all unique item names (columns)
  const columns = useMemo(() => {
    const itemNames = new Set<string>();
    data.forEach((m) => {
      m.itens?.forEach((i) => itemNames.add(i.nome));
      m.taxa_extra?.forEach((t) => itemNames.add(`Taxa: ${t.descricao}`));
    });
    // Sort columns: fix standard ones first if possible, else alphabetical
    return Array.from(itemNames).sort();
  }, [data]);

  // 2. Calculate Totals
  const totals = useMemo(() => {
    const t: Record<string, number> = {
      previsto: 0,
      pago: 0,
      a_receber: 0,
    };
    // Initialize column totals
    columns.forEach((col) => (t[col] = 0));

    data.forEach((m) => {
      const isPaid = m.status === "PAGO";
      const valorTotal = Number(m.valor_total || m.valor); // Nominal/Expected
      const valorPago = isPaid ? valorTotal : 0;

      t.previsto += valorTotal;
      t.pago += valorPago;
      if (!isPaid) t.a_receber += valorTotal;

      // Add breakdowns
      m.itens?.forEach((i) => {
        if (columns.includes(i.nome)) {
          // If paid, we consider it "realized revenue" for that bucket?
          // The user "control" sheet usually tracks what *should* be there or what *is* there.
          // Usually "Receitas" -> what came in. "A Receber" -> what is pending.
          // Let's assume the breakdown follows the status. If paid, adds to totals?
          // Actually, typically a control sheet lists the *distribution* of the value.
          // If it's a "Receitas" report, it sums only paid.
          // If it's a "Control" sheet, it might show everything.
          // User said: "Nas receitas... apenas uma linha com ... quanto foi para cada caixa".
          // AND "na minha planilha de controle ... valor previsto ... valor pago ... e a composição".
          // So for the COMPOSITION columns, usually it's the nominal distribution (what goes where).
          // Let's sum based on the *nominal* value for the row, but perhaps visually distinguish paid vs unpaid rows.
          // Or, we can have a "Total Recebido" row at the bottom that only sums paid items.
          // Let's sum EVERYTHING into the column total, but we can also display "Recebido" separate.
          // For now, simple sum of the column across all listed items.
          t[i.nome] = (t[i.nome] || 0) + i.valor;
        }
      });
      m.taxa_extra?.forEach((taxa) => {
        const key = `Taxa: ${taxa.descricao}`;
        if (columns.includes(key)) {
          t[key] = (t[key] || 0) + taxa.valor_parcela;
        }
      });
    });

    return t;
  }, [data, columns]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Total Previsto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.previsto)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase text-green-600">
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.pago)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase text-red-600">
              A Receber (Inadimplência)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.a_receber)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto bg-white dark:bg-slate-950">
        <Table className="text-xs whitespace-nowrap">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px] font-bold">Sócio</TableHead>
              <TableHead className="font-bold">Mês Ref</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold text-blue-600">
                V. Nominal
              </TableHead>
              <TableHead className="text-right font-bold text-green-600">
                V. Pago
              </TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="text-right font-semibold border-l"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((m) => {
              const valorNominal = Number(m.valor_total || m.valor);
              const valorPago = m.status === "PAGO" ? valorNominal : 0;

              return (
                <TableRow
                  key={m.id}
                  className={m.status !== "PAGO" ? "opacity-80" : ""}
                >
                  <TableCell className="font-medium">
                    {m.socio?.nomeCompleto}
                  </TableCell>
                  <TableCell>{m.mes_referencia}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 h-5 
                        ${m.status === "PAGO" ? "border-green-500 text-green-500" : "border-red-400 text-red-400"}
                     `}
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono bg-blue-50/50 dark:bg-blue-950/10">
                    {formatCurrency(valorNominal)}
                  </TableCell>
                  <TableCell className="text-right font-mono bg-green-50/50 dark:bg-green-950/10 text-green-700 dark:text-green-400">
                    {valorPago > 0 ? formatCurrency(valorPago) : "-"}
                  </TableCell>

                  {columns.map((col) => {
                    // Check itens
                    let val = 0;
                    const item = m.itens?.find((i) => i.nome === col);
                    if (item) val = item.valor;

                    // Check taxas
                    if (!val && col.startsWith("Taxa: ")) {
                      const originalName = col.replace("Taxa: ", "");
                      const taxa = m.taxa_extra?.find(
                        (t) => t.descricao === originalName,
                      );
                      if (taxa) val = taxa.valor_parcela;
                    }

                    return (
                      <TableCell
                        key={col}
                        className="text-right font-mono text-muted-foreground border-l"
                      >
                        {val > 0 ? formatCurrency(val) : "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}

            {/* Totals Row */}
            <TableRow className="bg-muted font-bold border-t-2 border-black/20">
              <TableCell colSpan={3} className="text-right uppercase text-xs">
                Totais
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.previsto)}
              </TableCell>
              <TableCell className="text-right text-green-700">
                {formatCurrency(totals.pago)}
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col} className="text-right border-l">
                  {formatCurrency(totals[col] || 0)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
