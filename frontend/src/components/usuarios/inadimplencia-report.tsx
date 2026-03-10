"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  mensalidadeService,
  InadimplenciaReportItem,
} from "@/services/mensalidade-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function InadimplenciaReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<InadimplenciaReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      if (!user?.nucleoId) return;
      try {
        setLoading(true);
        const data = await mensalidadeService.getInadimplenciaReport(
          user.nucleoId,
        );
        setReport(data);
      } catch (error) {
        console.error("Erro ao carregar relatório de inadimplência:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Inadimplência</CardTitle>
      </CardHeader>
      <CardContent>
        {report.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma inadimplência encontrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sócio</TableHead>
                <TableHead>Meses em Atraso</TableHead>
                <TableHead>Total Devido</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.map((item) => (
                <TableRow key={item.socio.id}>
                  <TableCell className="font-medium">
                    {item.socio.nomeCompleto}
                    <div className="text-xs text-muted-foreground">
                      {item.socio.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {item.meses_atraso} meses
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-red-600">
                    {formatCurrency(item.total_devido)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.mensalidades.map((m) => (
                        <Badge key={m.id} variant="outline" className="text-xs">
                          {m.mes_referencia} ({formatCurrency(m.valor)})
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
