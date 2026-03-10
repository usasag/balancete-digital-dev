"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { lancamentoService, Lancamento } from "@/services/lancamento-service";
import { caixaService, Caixa } from "@/services/caixa-service";
import { formatCurrency, cn } from "@/lib/utils";
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
import { Edit, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LancamentoFormDialog } from "@/components/lancamentos/lancamento-form-dialog";

export default function LancamentoList() {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(
    null,
  );

  const [sortConfig, setSortConfig] = useState("date-desc");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RECEITA" | "DESPESA">(
    "ALL",
  );
  const [caixaFilter, setCaixaFilter] = useState<string>("ALL");

  const fetchData = async () => {
    if (!user?.nucleoId) return;
    setLoading(true);
    try {
      const [lancamentoData, caixaData] = await Promise.all([
        lancamentoService.findAllByNucleo(user.nucleoId),
        caixaService.findAllByNucleo(user.nucleoId),
      ]);
      setLancamentos(lancamentoData);
      setCaixas(caixaData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredLancamentos = lancamentos.filter((l) => {
    if (typeFilter !== "ALL" && l.tipo !== typeFilter) return false;
    if (caixaFilter !== "ALL" && l.caixaId !== caixaFilter) return false;
    return true;
  });

  const sortedLancamentos = [...filteredLancamentos].sort((a, b) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await lancamentoService.remove(id);
      setLancamentos((prev) => prev.filter((l) => l.id !== id));
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir lançamento.");
    }
  };

  const openNewDialog = () => {
    setEditingLancamento(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (l: Lancamento) => {
    setEditingLancamento(l);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Lançamentos Financeiros
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-stretch sm:items-center flex-wrap">
          {/* Caixa Filter */}
          <Select value={caixaFilter} onValueChange={setCaixaFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por Caixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Caixas</SelectItem>
              {caixas.map((caixa) => (
                <SelectItem key={caixa.id} value={caixa.id}>
                  {caixa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-md overflow-hidden bg-background self-start sm:self-auto">
            <Button
              variant={typeFilter === "ALL" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("ALL")}
              className="rounded-none border-r"
            >
              Todos
            </Button>
            <Button
              variant={typeFilter === "RECEITA" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("RECEITA")}
              className="rounded-none border-r text-green-600 hover:text-green-700"
            >
              Receitas
            </Button>
            <Button
              variant={typeFilter === "DESPESA" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter("DESPESA")}
              className="rounded-none text-red-600 hover:text-red-700"
            >
              Despesas
            </Button>
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={sortConfig}
            onChange={(e) => setSortConfig(e.target.value)}
          >
            <option value="date-desc">Data (Mais recente)</option>
            <option value="date-asc">Data (Mais antiga)</option>
            <option value="value-desc">Valor (Maior primeiro)</option>
            <option value="value-asc">Valor (Menor primeiro)</option>
            <option value="alpha-asc">Descrição (A-Z)</option>
            <option value="alpha-desc">Descrição (Z-A)</option>
          </select>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Caixa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLancamentos.map((lancamento) => (
              <TableRow key={lancamento.id}>
                <TableCell>
                  {new Date(lancamento.data_movimento).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {lancamento.caixa?.nome || "Tesouraria"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      lancamento.tipo === "RECEITA" ? "default" : "destructive"
                    }
                    className={
                      lancamento.tipo === "RECEITA"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }
                  >
                    {lancamento.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {lancamento.categoria || "Geral"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lancamento.subcategoria && (
                    <Badge variant="secondary" className="mr-2">
                      {lancamento.subcategoria}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{lancamento.descricao}</span>
                </TableCell>
                <TableCell className="max-w-[250px]">
                  {lancamento.observacao ? (
                    <span className="text-xs text-muted-foreground block whitespace-normal break-words leading-relaxed">
                      {lancamento.observacao}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    lancamento.tipo === "RECEITA"
                      ? "text-green-600"
                      : "text-red-600",
                  )}
                >
                  {formatCurrency(lancamento.valor)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      lancamento.status === "REGISTRADO"
                        ? "default"
                        : "secondary"
                    }
                    className={
                      lancamento.status === "REGISTRADO"
                        ? "bg-blue-600"
                        : "bg-gray-400"
                    }
                  >
                    {lancamento.status || "RASCUNHO"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(lancamento)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(lancamento.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && lancamentos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center h-24 text-muted-foreground"
                >
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LancamentoFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchData}
        nucleoId={user?.nucleoId || ""}
        lancamentoToEdit={editingLancamento}
      />
    </div>
  );
}
