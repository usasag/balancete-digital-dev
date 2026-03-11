"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { lancamentoService, Lancamento } from "@/services/lancamento-service";
import { caixaService, Caixa } from "@/services/caixa-service";
import { Role } from "@/types/role";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<
    { linha: number; mensagem: string }[]
  >([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidenceCaixaId, setEvidenceCaixaId] = useState<string>("");
  const [evidenceStartDate, setEvidenceStartDate] = useState<string>("");
  const [evidenceEndDate, setEvidenceEndDate] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [linkingEvidence, setLinkingEvidence] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [referenceMonth, setReferenceMonth] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7),
  );
  const [targetMonth, setTargetMonth] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );
  const [duplicating, setDuplicating] = useState(false);
  const [importLogs, setImportLogs] = useState<
    {
      id: string;
      arquivoNome: string;
      linhasCriadas: number;
      linhasComErro: number;
      dataCriacao: string;
      usuario?: { nomeCompleto?: string; email?: string };
    }[]
  >([]);

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

      if (user.role === Role.TESOURARIA || user.role === Role.ADMIN_GLOBAL) {
        const logs = await lancamentoService.getImportLogs();
        setImportLogs(logs);
      } else {
        setImportLogs([]);
      }
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

  const handlePreviewImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await lancamentoService.importPreview(importFile);
      setPreviewErrors(result.errors);
      setPreviewCount(result.validRows.length);
      toast.success("Prévia processada.");
    } catch {
      toast.error("Falha ao processar prévia de importação.");
    } finally {
      setImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await lancamentoService.importExecute(importFile);
      toast.success(`${result.created} lançamentos importados.`);
      setPreviewErrors(result.errors);
      await fetchData();
    } catch {
      toast.error("Falha ao importar lançamentos.");
    } finally {
      setImporting(false);
    }
  };

  const handleLinkSharedEvidence = async () => {
    if (!evidenceCaixaId || !evidenceStartDate || !evidenceEndDate || !evidenceUrl)
      return;
    setLinkingEvidence(true);
    try {
      const result = await lancamentoService.vincularEvidenciaReceitas({
        caixaId: evidenceCaixaId,
        dataInicio: evidenceStartDate,
        dataFim: evidenceEndDate,
        comprovante_url: evidenceUrl,
      });
      toast.success(`${result.updated} receitas atualizadas com evidência.`);
      setEvidenceDialogOpen(false);
      setEvidenceCaixaId("");
      setEvidenceStartDate("");
      setEvidenceEndDate("");
      setEvidenceUrl("");
      await fetchData();
    } catch {
      toast.error("Falha ao vincular evidência compartilhada.");
    } finally {
      setLinkingEvidence(false);
    }
  };

  const handleDuplicatePreviousMonth = async () => {
    if (!referenceMonth || !targetMonth) return;
    const [refYear, refMon] = referenceMonth.split("-").map(Number);
    const [tarYear, tarMon] = targetMonth.split("-").map(Number);

    setDuplicating(true);
    try {
      const result = await lancamentoService.duplicatePreviousMonth({
        referenceYear: refYear,
        referenceMonth: refMon,
        targetYear: tarYear,
        targetMonth: tarMon,
      });
      toast.success(
        `Duplicação concluída. Origem: ${result.sourceCount}, criados: ${result.created}, erros: ${result.errors.length}.`,
      );
      setDuplicateDialogOpen(false);
      await fetchData();
    } catch {
      toast.error("Falha ao duplicar lançamentos do mês anterior.");
    } finally {
      setDuplicating(false);
    }
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
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            Importar Planilha
          </Button>
          <Button
            variant="outline"
            onClick={() => setEvidenceDialogOpen(true)}
          >
            Evidência Compartilhada (Receitas)
          </Button>
          <Button
            variant="outline"
            onClick={() => setDuplicateDialogOpen(true)}
          >
            Duplicar mês anterior
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
                <TableHead>Evidência</TableHead>
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
                <TableCell>
                  {lancamento.evidenciaWebViewLink ||
                  lancamento.comprovante_url ? (
                    <a
                      href={
                        lancamento.evidenciaWebViewLink ||
                        lancamento.comprovante_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline text-primary"
                    >
                      Ver evidência
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
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
                    colSpan={11}
                    className="text-center h-24 text-muted-foreground"
                  >
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(user?.role === Role.TESOURARIA || user?.role === Role.ADMIN_GLOBAL) && (
        <div className="rounded-md border p-4 space-y-3">
          <h2 className="text-lg font-semibold">Logs de importação</h2>
          {importLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum log de importação encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {importLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border p-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">{log.arquivoNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.dataCriacao).toLocaleString()} -{" "}
                      {log.usuario?.nomeCompleto || log.usuario?.email || "Usuário"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Criadas: {log.linhasCriadas}</p>
                    <p>Erros: {log.linhasComErro}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <LancamentoFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchData}
        nucleoId={user?.nucleoId || ""}
        lancamentoToEdit={editingLancamento}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importação em lote de lançamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Arquivo CSV/XLSX</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,.ofx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <p className="text-sm text-muted-foreground">
              Arquivos aceitos: CSV, XLSX, XLS e OFX. Para planilhas, colunas
              esperadas: tipo, descricao, valor, categoria, subcategoria,
              observacao, data_movimento, caixaId, status, comprovante_url.
            </p>
            <p className="text-xs text-muted-foreground">
              Regra OFX: receitas entram como REGISTRADO; despesas entram como
              RASCUNHO para exigir comprovante fiscal próprio.
            </p>
            <a
              href="/templates/template-importacao-lancamentos.csv"
              download
              className="text-sm underline text-primary"
            >
              Baixar template de importação
            </a>
            <div className="rounded-md border p-3 text-sm">
              <p>
                Linhas válidas na prévia: <strong>{previewCount}</strong>
              </p>
              <p>
                Linhas com erro: <strong>{previewErrors.length}</strong>
              </p>
            </div>
            {previewErrors.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border p-2 text-sm">
                {previewErrors.map((err, idx) => (
                  <p key={`${err.linha}-${idx}`}>
                    Linha {err.linha}: {err.mensagem}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              variant="outline"
              disabled={!importFile || importing}
              onClick={handlePreviewImport}
            >
              Prévia
            </Button>
            <Button
              disabled={!importFile || importing}
              onClick={handleExecuteImport}
            >
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Evidência compartilhada para receitas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use para vincular uma única evidência fiscal (ex.: OFX/extrato)
              para várias receitas da mesma conta/caixa no período.
            </p>

            <div className="space-y-2">
              <Label>Caixa</Label>
              <Select value={evidenceCaixaId} onValueChange={setEvidenceCaixaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a caixa" />
                </SelectTrigger>
                <SelectContent>
                  {caixas.map((caixa) => (
                    <SelectItem key={caixa.id} value={caixa.id}>
                      {caixa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input
                  type="date"
                  value={evidenceStartDate}
                  onChange={(e) => setEvidenceStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={evidenceEndDate}
                  onChange={(e) => setEvidenceEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL da evidência</Label>
              <Input
                placeholder="https://..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEvidenceDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                !evidenceCaixaId ||
                !evidenceStartDate ||
                !evidenceEndDate ||
                !evidenceUrl ||
                linkingEvidence
              }
              onClick={handleLinkSharedEvidence}
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Duplicar lançamentos por mês</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Replica os lançamentos do mês de origem para o mês de destino.
              Despesas serão criadas como rascunho.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Mês de origem</Label>
                <Input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mês de destino</Label>
                <Input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDuplicatePreviousMonth}
              disabled={!referenceMonth || !targetMonth || duplicating}
            >
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
