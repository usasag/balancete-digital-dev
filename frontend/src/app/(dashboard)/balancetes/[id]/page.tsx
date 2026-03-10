"use client";

import { useEffect, useState, use, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext"; // Keeping for explicit type check if needed later, though unused now
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming Table components exist, or use div grid
import {
  balanceteService,
  Balancete,
  BalanceteAprovacao,
  Lancamento,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils"; // For conditional classes

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

export default function BalanceteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [balancete, setBalancete] = useState<Balancete | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [sortConfig, setSortConfig] = useState("date-desc");

  const getSortedLancamentos = () => {
    if (!balancete?.lancamentos) return [];

    return [...balancete.lancamentos].sort((a, b) => {
      switch (sortConfig) {
        case "date-desc":
          return (
            new Date(b.data_movimento).getTime() -
            new Date(a.data_movimento).getTime()
          );
        case "date-asc":
          return (
            new Date(a.data_movimento).getTime() -
            new Date(b.data_movimento).getTime()
          );
        case "value-desc":
          return Number(b.valor) - Number(a.valor);
        case "value-asc":
          return Number(a.valor) - Number(b.valor);
        case "alpha-asc":
          return a.descricao.localeCompare(b.descricao);
        case "alpha-desc":
          return b.descricao.localeCompare(a.descricao);
        default:
          return 0;
      }
    });
  };

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

  const handleApprove = async () => {
    if (!balancete) return;
    try {
      await balanceteService.approve(balancete.id, "APROVADO");
      const data = await balanceteService.findOne(id);
      setBalancete(data);
    } catch (error) {
      console.error("Error approving:", error);
      alert("Erro ao aprovar balancete.");
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!balancete) return <div className="p-8">Balancete não encontrado.</div>;

  const myApproval = balancete.aprovacoes?.find(
    (a) => a.usuario?.email === user?.email,
  );
  const showApproveButton = myApproval && myApproval.status === "PENDENTE";

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

      <div
        className={cn(
          "p-4 rounded-lg border",
          isApproved
            ? "bg-green-50/50 border-green-200"
            : "bg-orange-50/50 border-orange-200",
        )}
      >
        <p className="text-sm font-medium">
          {isApproved
            ? "✅ Este balancete foi aprovado e está consolidado."
            : "⚠️ Este balancete ainda não foi aprovado ou possui pendências."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Balancete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Núcleo ID:</span>
              <span>{balancete.nucleoId}</span>
            </div>
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
            <CardTitle>Aprovações</CardTitle>
            <CardDescription>
              Status das aprovações necessárias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balancete.aprovacoes && balancete.aprovacoes.length > 0 ? (
                balancete.aprovacoes.map((aprovacao: BalanceteAprovacao) => (
                  <div
                    key={aprovacao.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {aprovacao.usuario?.nomeCompleto || "Usuário"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {aprovacao.role_aprovador}
                      </p>
                    </div>
                    <Badge
                      variant={
                        aprovacao.status === "APROVADO"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {aprovacao.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  Nenhuma aprovação registrada.
                </p>
              )}
            </div>
            {showApproveButton && (
              <div className="mt-6 flex space-x-3">
                <Button onClick={handleApprove} className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                </Button>
                <Button variant="destructive" className="w-full">
                  <XCircle className="mr-2 h-4 w-4" /> Reprovar
                </Button>
              </div>
            )}
            {!showApproveButton && balancete.status !== "APROVADO" && (
              <p className="text-sm text-center mt-4 text-muted-foreground">
                Você não tem aprovações pendentes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LANÇAMENTOS SECTION */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>Lançamentos do Mês</CardTitle>
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:gap-2">
              <Button
                variant={viewMode === "summary" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("summary")}
                className="w-full md:w-auto"
              >
                Resumo por Categoria
              </Button>
              <Button
                variant={viewMode === "detailed" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("detailed")}
                className="w-full md:w-auto"
              >
                Detalhado
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {balancete.lancamentos && balancete.lancamentos.length > 0 ? (
            <>
              {viewMode === "summary" ? (
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
                              acc[cat].subcategories[subcat] = {
                                value: 0,
                                transactions: [],
                              };
                            }
                            acc[cat].subcategories[subcat].value += Number(
                              curr.valor,
                            );
                            acc[cat].subcategories[subcat].transactions.push(
                              curr,
                            );

                            return acc;
                          },
                          {} as Record<
                            string,
                            {
                              value: number;
                              type: string;
                              subcategories: Record<
                                string,
                                { value: number; transactions: Lancamento[] }
                              >;
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
                            <Fragment key={category}>
                              <TableRow
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
                                    isExpense
                                      ? "text-red-600"
                                      : "text-green-600",
                                  )}
                                >
                                  {formatCurrency(displayValue)}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell
                                    colSpan={3}
                                    className="p-0 border-0"
                                  >
                                    <div className="bg-background">
                                      {Object.entries(subcategories)
                                        .sort(
                                          ([, a], [, b]) => b.value - a.value,
                                        )
                                        .map(
                                          ([subcat, { value: subValue }]) => (
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
                                                    isExpense
                                                      ? -subValue
                                                      : subValue,
                                                  )}
                                                </span>
                                              </div>
                                              {/* Transactions hidden by default as requested */}
                                            </div>
                                          ),
                                        )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium">
                        Ordenar por:
                      </label>
                      <Select value={sortConfig} onValueChange={setSortConfig}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Data (Recente)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date-desc">
                            Data (Mais recente)
                          </SelectItem>
                          <SelectItem value="date-asc">
                            Data (Mais antiga)
                          </SelectItem>
                          <SelectItem value="value-desc">
                            Valor (Maior primeiro)
                          </SelectItem>
                          <SelectItem value="value-asc">
                            Valor (Menor primeiro)
                          </SelectItem>
                          <SelectItem value="alpha-asc">
                            Descrição (A-Z)
                          </SelectItem>
                          <SelectItem value="alpha-desc">
                            Descrição (Z-A)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium">
                        Filtrar por Categoria:
                      </label>
                      <Select
                        value={filterCategory}
                        onValueChange={setFilterCategory}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Todas</SelectItem>
                          {Array.from(
                            new Set(
                              balancete.lancamentos.map(
                                (l) => l.categoria || "Sem Categoria",
                              ),
                            ),
                          )
                            .sort()
                            .map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Caixa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getSortedLancamentos()
                          .filter(
                            (l) =>
                              filterCategory === "ALL" ||
                              (l.categoria || "Sem Categoria") ===
                                filterCategory,
                          )
                          .map((lanc) => (
                            <TableRow key={lanc.id}>
                              <TableCell>
                                {new Date(
                                  lanc.data_movimento,
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {lanc.caixa?.nome || "Tesouraria"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    lanc.tipo === "RECEITA"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    lanc.tipo === "RECEITA"
                                      ? "bg-green-600"
                                      : "bg-red-600"
                                  }
                                >
                                  {lanc.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {lanc.categoria || "Geral"}
                                </Badge>
                              </TableCell>
                              <TableCell>{lanc.descricao}</TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-medium",
                                  lanc.tipo === "RECEITA"
                                    ? "text-green-600"
                                    : "text-red-600",
                                )}
                              >
                                {formatCurrency(lanc.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lançamento encontrado para este período.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
