"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { balanceteService, Balancete } from "@/services/balancete-service";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";

// Helper to format YYYY-MM to "Dezembro de 2024"
const formatAnoMes = (anoMes: string) => {
  if (!anoMes) return "-";
  const [year, month] = anoMes.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default function MeusBalancetesList() {
  const { user } = useAuth();
  const [balancetes, setBalancetes] = useState<Balancete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.nucleoId) return;

      setLoading(true);
      try {
        const data = await balanceteService.findAll();
        if (isMounted) {
          const sorted = data.sort((a, b) =>
            b.ano_mes.localeCompare(a.ano_mes),
          );
          setBalancetes(sorted);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Meus Balancetes</h1>
        {/* Socio cannot create balancetes */}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Saldo Inicial</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Saldo Final</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balancetes.map((balancete) => {
              const isApproved = balancete.status === "APROVADO";
              const resultado =
                (balancete.total_receitas || 0) -
                (balancete.total_despesas || 0);

              return (
                <TableRow key={balancete.id}>
                  <TableCell className="capitalize">
                    {formatAnoMes(balancete.ano_mes)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(balancete.saldo_inicial)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium",
                        resultado >= 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {formatCurrency(resultado)}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(balancete.saldo_final)}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        isApproved
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-orange-500 hover:bg-orange-600",
                      )}
                    >
                      {balancete.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" asChild>
                      <Link href={`/meus-balancetes/${balancete.id}`}>
                        Ver Resumo
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && balancetes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-24 text-muted-foreground"
                >
                  Nenhum balancete disponível.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
