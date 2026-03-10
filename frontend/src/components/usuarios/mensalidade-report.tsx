"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  mensalidadeService,
  Mensalidade,
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
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MensalidadeReportProps {
  data?: Mensalidade[];
}

export function MensalidadeReport({
  data: initialData,
}: MensalidadeReportProps) {
  const { user } = useAuth();
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(!initialData);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("ALL");
  const [userFilter, setUserFilter] = useState<string>("ALL");

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "data_vencimento", direction: "desc" });

  useEffect(() => {
    if (initialData) {
      setMensalidades(initialData);
      setLoading(false);
      return;
    }

    async function fetchReport() {
      if (!user?.nucleoId) return;
      try {
        setLoading(true);
        const data = await mensalidadeService.findAllByNucleo(user.nucleoId);
        setMensalidades(data);
      } catch (error) {
        console.error("Erro ao carregar mensalidades:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [user, initialData]);

  // Extract Tax Columns
  const taxColumns = useMemo(() => {
    const taxes = new Set<string>();
    mensalidades.forEach((m) => {
      m.taxa_extra?.forEach((t) => taxes.add(t.descricao || "Taxa"));
    });
    return Array.from(taxes).sort();
  }, [mensalidades]);

  // Extract Filter Options
  const months = useMemo(
    () => Array.from(new Set(mensalidades.map((m) => m.mes_referencia))).sort(),
    [mensalidades],
  );

  const users = useMemo(() => {
    const userMap = new Map<string, string>();
    mensalidades.forEach((m) => {
      if (m.socioId && m.socio?.nomeCompleto) {
        userMap.set(m.socioId, m.socio.nomeCompleto);
      }
    });
    return Array.from(userMap.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [mensalidades]);

  const filteredData = useMemo(() => {
    let data = [...mensalidades];

    if (statusFilter !== "ALL") {
      data = data.filter((m) => m.status === statusFilter);
    }
    if (monthFilter !== "ALL") {
      data = data.filter((m) => m.mes_referencia === monthFilter);
    }
    if (userFilter !== "ALL") {
      data = data.filter((m) => m.socioId === userFilter);
    }

    // Sorting
    data.sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      // Handle specific columns
      if (sortConfig.key === "socio") {
        aValue = a.socio?.nomeCompleto || "";
        bValue = b.socio?.nomeCompleto || "";
      } else if (
        sortConfig.key === "data_vencimento" ||
        sortConfig.key === "data_pagamento" ||
        sortConfig.key === "data_acordo"
      ) {
        const key = sortConfig.key as
          | "data_vencimento"
          | "data_pagamento"
          | "data_acordo";
        const dateA = a[key];
        const dateB = b[key];
        aValue = dateA ? new Date(dateA as string).getTime() : 0;
        bValue = dateB ? new Date(dateB as string).getTime() : 0;
      } else if (taxColumns.includes(sortConfig.key)) {
        // Sort by tax value
        const tA = a.taxa_extra?.find((t) => t.descricao === sortConfig.key);
        const tB = b.taxa_extra?.find((t) => t.descricao === sortConfig.key);
        aValue = tA ? Number(tA.valor_parcela) : -1;
        bValue = tB ? Number(tB.valor_parcela) : -1;
      } else if (sortConfig.key === "valor_pago") {
        // Special field for "Valor Pago" logic
        aValue = a.status === "PAGO" ? Number(a.valor_total || a.valor) : -1;
        bValue = b.status === "PAGO" ? Number(b.valor_total || b.valor) : -1;
      } else {
        // Default fallback for scalar properties (valor, status, etc.)
        const key = sortConfig.key as keyof Mensalidade;
        const valA = a[key];
        const valB = b[key];
        // Ensure we only sort sortable types
        if (typeof valA === "string" || typeof valA === "number") {
          aValue = valA;
        }
        if (typeof valB === "string" || typeof valB === "number") {
          bValue = valB;
        }
      }

      // Safe comparison
      if (aValue === undefined) aValue = "";
      if (bValue === undefined) bValue = "";

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [
    mensalidades,
    statusFilter,
    monthFilter,
    userFilter,
    sortConfig,
    taxColumns,
  ]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig.key !== columnName)
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const statusOptions = [
    { value: "ALL", label: "Todos" },
    { value: "INADIMPLENTE", label: "Inadimplentes" },
    { value: "PENDENTE", label: "Pendentes" },
    { value: "ATRASADO", label: "Atrasados" },
    { value: "PAGO", label: "Pagos" },
    { value: "EM ACORDO", label: "Em Acordo" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAGO":
        return <Badge className="bg-green-600">Pago</Badge>;
      case "PENDENTE":
        return <Badge variant="outline">Pendente</Badge>;
      case "ATRASADO":
        return <Badge variant="destructive">Atrasado</Badge>;
      case "INADIMPLENTE":
        return <Badge variant="destructive">Inadimplente</Badge>;
      case "EM ACORDO":
        return <Badge className="bg-blue-600">Em Acordo</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
        <CardTitle>Relatório Financeiro Detalhado</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visão detalhada de composição e recebimentos da tesouraria. Use o
          scroll horizontal para ver todas as taxas.
        </p>
      </CardHeader>
      <CardContent>
        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Mês Referência</Label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Sócio</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os Sócios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Sócios</SelectItem>
                {users.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="min-w-[200px]"
                  onClick={() => requestSort("socio")}
                >
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent font-bold"
                  >
                    Sócio {getSortIcon("socio")}
                  </Button>
                </TableHead>
                <TableHead onClick={() => requestSort("mes_referencia")}>
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent font-bold"
                  >
                    Mês Ref {getSortIcon("mes_referencia")}
                  </Button>
                </TableHead>
                <TableHead onClick={() => requestSort("status")}>
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent font-bold"
                  >
                    Status {getSortIcon("status")}
                  </Button>
                </TableHead>
                {/* Fixed Value Columns */}
                <TableHead
                  className="text-right min-w-[120px]"
                  onClick={() => requestSort("valor_total")}
                >
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent font-bold w-full text-right"
                  >
                    V. Nominal {getSortIcon("valor_total")}
                  </Button>
                </TableHead>
                <TableHead
                  className="text-right min-w-[120px]"
                  onClick={() => requestSort("valor_pago")}
                >
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent font-bold w-full text-right"
                  >
                    V. Pago {getSortIcon("valor_pago")}
                  </Button>
                </TableHead>
                <TableHead
                  className="text-right min-w-[120px]"
                  onClick={() => requestSort("valor_base")}
                >
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent font-bold w-full text-right"
                  >
                    Mensalidade {getSortIcon("valor_base")}
                  </Button>
                </TableHead>
                {/* Dynamic Tax Columns */}
                {taxColumns.map((tax) => (
                  <TableHead
                    key={tax}
                    className="text-right min-w-[150px]"
                    onClick={() => requestSort(tax)}
                  >
                    <Button
                      variant="ghost"
                      className="p-0 hover:bg-transparent font-bold w-full text-right"
                    >
                      {tax} {getSortIcon(tax)}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6 + taxColumns.length}
                    className="text-center h-24"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.socio?.nomeCompleto || "Sócio Desconhecido"}
                    </TableCell>
                    <TableCell>{m.mes_referencia}</TableCell>
                    <TableCell>{getStatusBadge(m.status)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(m.valor_total || m.valor)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {m.status === "PAGO"
                        ? formatCurrency(m.valor_total || m.valor)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(m.valor_base)}
                    </TableCell>
                    {/* Render Tax Values */}
                    {taxColumns.map((tax) => {
                      const taxItem = m.taxa_extra?.find(
                        (t) => t.descricao === tax,
                      );
                      return (
                        <TableCell
                          key={tax}
                          className="text-right text-muted-foreground"
                        >
                          {taxItem
                            ? formatCurrency(taxItem.valor_parcela)
                            : "-"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
