"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Periodo, periodoService } from "@/services/periodo-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, Unlock, Calendar, FolderOpen, History } from "lucide-react";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function PeriodosPage() {
  const { user } = useAuth();
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );

  // Reabertura Dialog State
  const [isReabrirDialogOpen, setIsReabrirDialogOpen] = useState(false);
  const [periodoToReopen, setPeriodoToReopen] = useState<Periodo | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPeriodos = async () => {
    if (!user?.nucleoId) return;
    // setLoading(true);
    try {
      const data = await periodoService.findAllByNucleo(user.nucleoId);
      setPeriodos(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar períodos.");
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPeriodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAbrir = async (mes: number) => {
    if (!user?.nucleoId) return;
    try {
      setActionLoading(true);
      await periodoService.abrir(mes, selectedYear, user.nucleoId);
      toast.success("Período aberto com sucesso!");
      fetchPeriodos();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Erro ao abrir período.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFechar = async (mes: number) => {
    if (!user?.nucleoId) return;
    if (
      !confirm(
        "Tem certeza que deseja fechar este período? Certifique-se de que todos os lançamentos estão corretos.",
      )
    )
      return;
    try {
      setActionLoading(true);
      await periodoService.fechar(mes, selectedYear, user.nucleoId);
      toast.success("Período fechado com sucesso!");
      fetchPeriodos();
    } catch (error: unknown) {
      console.error(error);
      const err = error as {
        response?: { data?: { message?: string | string[] } };
      };
      let msg = err.response?.data?.message;
      if (Array.isArray(msg)) msg = msg.join(", ");
      toast.error(msg || "Erro ao fechar período.");
    } finally {
      setActionLoading(false);
    }
  };

  const openReabrirDialog = (periodo: Periodo) => {
    setPeriodoToReopen(periodo);
    setJustificativa("");
    setIsReabrirDialogOpen(true);
  };

  const handleReabrirSubmit = async () => {
    if (!periodoToReopen || !justificativa) return;
    try {
      setActionLoading(true);
      await periodoService.reabrir(periodoToReopen.id, justificativa);
      toast.success("Período reaberto com sucesso!");
      setIsReabrirDialogOpen(false);
      fetchPeriodos();
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Erro ao reabrir período.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const getPeriodoForMonth = (mes: number) => {
    return periodos.find((p) => p.mes === mes && p.ano === selectedYear);
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gerenciamento de Períodos
          </h1>
          <p className="text-muted-foreground">
            Controle a abertura e fechamento dos meses contábeis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Ano:</Label>
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(Number(val))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - 2 + i,
              ).map((yr) => (
                <SelectItem key={yr} value={String(yr)}>
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTHS.map((monthName, index) => {
          const mes = index + 1;
          const periodo = getPeriodoForMonth(mes);
          const isOpen = periodo?.status === "ABERTO";
          const isClosed = periodo?.status === "FECHADO";
          const pendencias = periodo?.pendencias || 0;
          const hasPendencias = pendencias > 0;

          let borderColor = "border-l-slate-300";
          if (isClosed) borderColor = "border-l-red-500";
          else if (isOpen && hasPendencias) borderColor = "border-l-amber-500";
          else if (isOpen) borderColor = "border-l-green-500";

          return (
            <Card key={mes} className={`border-l-4 ${borderColor}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {monthName}
                  </CardTitle>
                  {periodo ? (
                    <Badge
                      variant={
                        isOpen
                          ? hasPendencias
                            ? "secondary"
                            : "default"
                          : "secondary"
                      }
                      className={
                        isOpen
                          ? hasPendencias
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : "bg-green-600 hover:bg-green-600"
                          : ""
                      }
                    >
                      {periodo.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400">
                      Não Iniciado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground min-h-[40px]">
                    {isClosed ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <Lock className="h-3 w-3" /> Fechado em{" "}
                        {periodo?.data_fechamento
                          ? new Date(
                              periodo.data_fechamento,
                            ).toLocaleDateString()
                          : "-"}
                      </span>
                    ) : isOpen ? (
                      hasPendencias ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <FolderOpen className="h-3 w-3" /> {pendencias}{" "}
                          Pendências (Rascunhos)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600">
                          <FolderOpen className="h-3 w-3" /> Pronto para fechar
                        </span>
                      )
                    ) : (
                      "Período não iniciado. Abra para começar."
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    {!periodo && (
                      <Button
                        size="sm"
                        onClick={() => handleAbrir(mes)}
                        disabled={actionLoading}
                      >
                        <Unlock className="mr-2 h-3 w-3" /> Abrir
                      </Button>
                    )}
                    {isOpen && (
                      <Button
                        size="sm"
                        variant={hasPendencias ? "ghost" : "outline"}
                        className={hasPendencias ? "text-muted-foreground" : ""}
                        onClick={() => handleFechar(mes)}
                        disabled={actionLoading || hasPendencias}
                        title={
                          hasPendencias
                            ? "Resolva as pendências antes de fechar"
                            : "Fechar Período"
                        }
                      >
                        <Lock className="mr-2 h-3 w-3" /> Fechar
                      </Button>
                    )}
                    {isClosed && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openReabrirDialog(periodo)}
                        disabled={actionLoading}
                      >
                        <History className="mr-2 h-3 w-3" /> Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isReabrirDialogOpen} onOpenChange={setIsReabrirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir Período</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Para reabrir um período fechado, é necessário fornecer uma
              justificativa. Esta ação ficará registrada no histórico.
            </p>
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea
                value={justificativa}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setJustificativa(e.target.value)
                }
                placeholder="Ex: Correção de lançamento duplicado..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReabrirDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReabrirSubmit}
              disabled={!justificativa || actionLoading}
            >
              Confirmar Reabertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
