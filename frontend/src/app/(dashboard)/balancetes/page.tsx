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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
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

export default function BalanceteList() {
  const { user } = useAuth();
  const [balancetes, setBalancetes] = useState<Balancete[]>([]);
  const [loading, setLoading] = useState(true); // Default to true to prevent empty flash

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.nucleoId) return;

      setLoading(true);
      try {
        const data = await balanceteService.findAll();
        if (isMounted) {
          // Ensure sorting by date DESC (backend usually does this but let's be safe for check)
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

  // Helper to check consistency with PREVIOUS (older) month
  // Since list is DESC (Newest first), the "previous month" is at index + 1
  const checkconsistency = (current: Balancete, index: number) => {
    // If it's the last item, there's no older month to compare against in this list
    if (index === balancetes.length - 1) return true;

    const previousBalancete = balancetes[index + 1];

    // Check if they are actually consecutive months to be fair
    // (Optional logic, strictly requested: check if prev final == cur initial)
    const currentInitial = Number(current.saldo_inicial || 0);
    const previousFinal = Number(previousBalancete.saldo_final || 0);

    // Using a small epsilon for float comparison safety, though currency usually 2 decimals
    return Math.abs(currentInitial - previousFinal) < 0.01;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Balancetes</h1>
        <Button asChild>
          <Link href="/balancetes/novo">
            <Plus className="mr-2 h-4 w-4" /> Novo Balancete
          </Link>
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês/Ano</TableHead>
              <TableHead>Saldo Inicial</TableHead>
              <TableHead>Resultado do Mês</TableHead>
              <TableHead>Saldo Final</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balancetes.map((balancete, index) => {
              const isConsistent = checkconsistency(balancete, index);
              const isApproved = balancete.status === "APROVADO";

              return (
                <TableRow key={balancete.id}>
                  <TableCell className="capitalize flex items-center gap-2">
                    {formatAnoMes(balancete.ano_mes)}
                    {!isConsistent && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Inconsistência: Saldo Inicial difere do Saldo
                              Final do mês anterior!
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(balancete.saldo_inicial)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium",
                        (balancete.total_receitas || 0) -
                          (balancete.total_despesas || 0) >=
                          0
                          ? "text-green-600"
                          : "text-red-600",
                      )}
                    >
                      {formatCurrency(
                        (balancete.total_receitas || 0) -
                          (balancete.total_despesas || 0),
                      )}
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
                      <Link href={`/balancetes/${balancete.id}`}>
                        Ver Detalhes
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
                  Nenhum balancete encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
