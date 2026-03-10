"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  balanceteService,
  Balancete
} from "@/services/balancete-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const formatAnoMes = (anoMes: string) => {
  if (!anoMes) return "-";
  const [year, month] = anoMes.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default function MeusBalancetesDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [balancete, setBalancete] = useState<Balancete | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    let isMounted = true;
    const fetchBalancete = async () => {
      try {
        const data = await balanceteService.findOne(id);
        if (isMounted) {
          setBalancete(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchBalancete();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!balancete) return <div className="p-8">Balancete não encontrado.</div>;

  const isApproved = balancete.status === "APROVADO";

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            Balancete {formatAnoMes(balancete.ano_mes)}
          </h1>
          <Badge
            className={cn(
              "text-lg",
              isApproved
                ? "bg-green-600 hover:bg-green-700"
                : "bg-orange-500 hover:bg-orange-600",
            )}
          >
            {balancete.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Saldo Inicial:</span>
              <span>{formatCurrency(balancete.saldo_inicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-green-600">
                Total Receitas:
              </span>
              <span className="text-green-600">
                {formatCurrency(balancete.total_receitas)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-red-600">
                Total Despesas:
              </span>
              <span className="text-red-600">
                {formatCurrency(balancete.total_despesas)}
              </span>
            </div>
            <div className="flex justify-between border-t border-dashed py-2 my-1">
              <span className="font-semibold">Resultado do Mês:</span>
              <span
                className={cn(
                  "font-bold",
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
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold">Saldo Final:</span>
              <span className="font-bold">
                {formatCurrency(balancete.saldo_final)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição de Caixa</CardTitle>
            <CardDescription>Resumo por Fonte/Conta.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Logic to show breakdown by Caixa if available, or just placeholder */}
            <div className="text-sm text-muted-foreground">
              Obs: O detalhamento por conta/caixa está disponível nos relatórios
              internos.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo por Categoria</CardTitle>
          <CardDescription>
            Visão consolidada das receitas e despesas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balancete.lancamentos && balancete.lancamentos.length > 0 ? (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    balancete.lancamentos.reduce(
                      (acc, curr) => {
                        const cat = curr.categoria || "Sem Categoria";
                        if (!acc[cat]) {
                          acc[cat] = {
                            value: 0,
                            type: curr.tipo,
                            subcategories: {},
                          };
                        }
                        acc[cat].value += Number(curr.valor);

                        const subcat = curr.subcategoria || "Geral";
                        if (!acc[cat].subcategories[subcat]) {
                          acc[cat].subcategories[subcat] = 0;
                        }
                        acc[cat].subcategories[subcat] += Number(curr.valor);

                        return acc;
                      },
                      {} as Record<
                        string,
                        {
                          value: number;
                          type: string;
                          subcategories: Record<string, number>;
                        }
                      >,
                    ),
                  )
                    .sort(([, a], [, b]) => b.value - a.value)
                    .map(([category, { value, type, subcategories }]) => {
                      const isExpense = type === "DESPESA";
                      const displayValue = isExpense ? -value : value;
                      const isExpanded = expandedCategories.has(category);

                      return (
                        <>
                          <TableRow
                            key={category}
                            className="cursor-pointer hover:bg-muted/50 transition-colors font-semibold bg-muted/20"
                            onClick={() => {
                              const newSet = new Set(expandedCategories);
                              if (newSet.has(category)) {
                                newSet.delete(category);
                              } else {
                                newSet.add(category);
                              }
                              setExpandedCategories(newSet);
                            }}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-bold uppercase text-sm">
                              {category}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-bold",
                                isExpense ? "text-red-600" : "text-green-600",
                              )}
                            >
                              {formatCurrency(displayValue)}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={3} className="p-0 border-0">
                                <div className="bg-background">
                                  {Object.entries(subcategories)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([subcat, subValue]) => (
                                      <div
                                        key={subcat}
                                        className="border-b last:border-0"
                                      >
                                        <div className="flex justify-between p-3 pl-12 pr-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                          <span className="font-semibold text-base">
                                            {subcat}
                                          </span>
                                          <span
                                            className={cn(
                                              "text-base font-bold",
                                              isExpense
                                                ? "text-red-500"
                                                : "text-green-500",
                                            )}
                                          >
                                            {formatCurrency(
                                              isExpense ? -subValue : subValue,
                                            )}
                                          </span>
                                        </div>
                                        {/* Transactions are intentionally omitted here for Socio View */}
                                      </div>
                                    ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado financeiro disponível.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
