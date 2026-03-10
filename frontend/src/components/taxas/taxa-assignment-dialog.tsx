"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { UsuarioService } from "@/services/usuario-service";
import { Usuario } from "@/types/usuario";
import {
  Taxa,
  configuracaoService,
  ConfiguracaoFinanceira,
} from "@/services/taxa-service";
import { usuarioTaxaService } from "@/services/usuario-taxa-service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";

interface TaxaAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxa: Taxa | null;
  onSuccess: () => void;
  nucleoId?: string; // Optional if we want to pass it
}

interface UserRowState {
  id: string;
  selected: boolean;
  parcelas: number;
}

export function TaxaAssignmentDialog({
  open,
  onOpenChange,
  taxa,
  onSuccess,
}: TaxaAssignmentDialogProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [config, setConfig] = useState<ConfiguracaoFinanceira | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowStates, setRowStates] = useState<Record<string, UserRowState>>({});

  // Global controls
  const [globalParcelas, setGlobalParcelas] = useState(1);
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (open && taxa) {
      // Reset states
      setGlobalParcelas(taxa.parcelado ? taxa.total_parcelas || 1 : 1);
      setDataInicio(new Date().toISOString().split("T")[0]);
      setRowStates({});
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taxa]);

  const fetchData = async () => {
    if (!user?.nucleoId) return;
    try {
      setLoading(true);
      const [usersData, configData] = await Promise.all([
        UsuarioService.getByNucleo(user.nucleoId),
        configuracaoService.get(),
      ]);
      setUsers(usersData);
      setConfig(configData);
    } catch (error) {
      console.error("Error fetching data", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const getRowState = (userId: string) => {
    return (
      rowStates[userId] || {
        id: userId,
        selected: false,
        parcelas: globalParcelas,
      }
    );
  };

  const updateRowState = (userId: string, updates: Partial<UserRowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [userId]: { ...getRowState(userId), ...updates },
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    const newStates: Record<string, UserRowState> = {};
    users.forEach((u) => {
      newStates[u.id] = {
        id: u.id,
        selected: checked,
        parcelas: rowStates[u.id]?.parcelas || globalParcelas,
      };
    });
    setRowStates(newStates);
  };

  const selectedCount = Object.values(rowStates).filter(
    (r) => r.selected,
  ).length;
  const allSelected = users.length > 0 && selectedCount === users.length;

  const handleSubmit = async () => {
    if (!taxa) return;
    const selectedRows = Object.values(rowStates).filter((r) => r.selected);
    if (selectedRows.length === 0) return;

    setLoading(true);
    try {
      // We need to call assign for each user potentially if they have different parcels?
      // Or we can group by parcels number to optimize calls?
      // The current API accepts `usuarioIds` array, implying same config for all.
      // If we want "Flexible" per user, we might need a modified backend Endpoint
      // OR multiple calls.
      // Given the requirement "Flexible Installments", let's assume we might need to change backend
      // OR just make parallel calls for now if parcel counts differ.

      // Group by parcelas count to minimize requests
      const groups: Record<number, string[]> = {};
      selectedRows.forEach((row) => {
        const p = row.parcelas;
        if (!groups[p]) groups[p] = [];
        groups[p].push(row.id);
      });

      const promises = Object.entries(groups).map(([parcelas, ids]) => {
        return usuarioTaxaService.assign({
          usuarioIds: ids,
          taxaId: taxa.id,
          valorTotal: Number(taxa.valor),
          numParcelas: Number(parcelas),
          dataInicio: dataInicio,
        });
      });

      await Promise.all(promises);

      toast.success(`${selectedRows.length} usuários atribuídos com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atribuir taxas.");
    } finally {
      setLoading(false);
    }
  };

  // Helper Calculations
  const getFinancials = (user: Usuario, parcels: number) => {
    const base = Number(user.valor_base) || 0;

    // Config defaults to avoid NaN
    const dg = config?.valor_repasse_dg ? Number(config.valor_repasse_dg) : 0;
    const regiao = config?.valor_repasse_regiao
      ? Number(config.valor_repasse_regiao)
      : 0;
    const repasses = dg + regiao;

    const currentMonthly = base + repasses;

    // Tax calculation
    const taxTotal = Number(taxa?.valor) || 0;
    const installmentValue = parcels > 0 ? taxTotal / parcels : taxTotal;

    const postTaxMonthly = currentMonthly + installmentValue;

    // Paid Until
    const endDate = dayjs(dataInicio).add(parcels, "month");

    return {
      currentMonthly,
      postTaxMonthly,
      installmentValue,
      endDate: endDate.format("MM/YYYY"),
    };
  };

  // Logic to set default start date to "Next Month, Day 1"
  useEffect(() => {
    if (open) {
      const nextMonth = dayjs().add(1, "month").startOf("month");
      setDataInicio(nextMonth.format("YYYY-MM-DD"));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60"
        style={{ maxWidth: "98vw" }}
      >
        <DialogHeader className="p-6 pb-2 border-b border-white/10">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="text-blue-400">Atribuir Taxa:</span>
            {taxa?.nome}
          </DialogTitle>
          <div className="flex items-center gap-4 mt-4 bg-slate-900/50 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <Label className="text-slate-300">Início do Pagamento:</Label>
              <Input
                type="date"
                min={dayjs()
                  .add(1, "month")
                  .startOf("month")
                  .format("YYYY-MM-DD")}
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-auto bg-slate-900 border-slate-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-slate-300">Parcelas Padrão:</Label>
              <Input
                type="number"
                min={1}
                value={globalParcelas}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGlobalParcelas(val);
                  setRowStates((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((k) => {
                      next[k].parcelas = val;
                    });
                    return next;
                  });
                }}
                className="w-20 bg-slate-900 border-slate-700 text-center"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-900 shadow-sm">
              <TableRow className="border-b border-slate-800 hover:bg-slate-900/80">
                <TableHead className="w-[50px] text-slate-300">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => handleSelectAll(!!c)}
                    className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </TableHead>
                <TableHead className="text-slate-300 font-bold">
                  Nome do Sócio
                </TableHead>
                <TableHead className="text-slate-300 font-bold">
                  Status
                </TableHead>
                <TableHead className="text-right text-slate-300 font-bold">
                  Mensalidade Atual
                </TableHead>
                <TableHead className="text-right text-blue-400 font-bold">
                  Pós-Taxa (Estimado)
                </TableHead>
                <TableHead className="text-center w-[100px] text-slate-300 font-bold">
                  Parcelas
                </TableHead>
                <TableHead className="text-right text-slate-300 font-bold">
                  Valor Parc.
                </TableHead>
                <TableHead className="text-right text-slate-300 font-bold">
                  Pago Até
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const state = getRowState(u.id);
                const financials = getFinancials(u, state.parcelas);

                return (
                  <TableRow
                    key={u.id}
                    className={`border-b border-slate-800 transition-colors ${state.selected ? "bg-blue-950/30 hover:bg-blue-900/40" : "hover:bg-slate-900/50"}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={state.selected}
                        onCheckedChange={(c) =>
                          updateRowState(u.id, { selected: !!c })
                        }
                        className="border-slate-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-slate-200">
                      {u.nomeCompleto}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.ativo ? "default" : "destructive"}
                        className={
                          u.ativo
                            ? "bg-green-900/60 text-green-300 hover:bg-green-900/80"
                            : ""
                        }
                      >
                        {u.ativo ? "Regular" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-400">
                      {formatCurrency(financials.currentMonthly)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-400">
                      {formatCurrency(financials.postTaxMonthly)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={state.parcelas}
                        disabled={!state.selected}
                        onChange={(e) =>
                          updateRowState(u.id, {
                            parcelas: Number(e.target.value),
                          })
                        }
                        className="h-8 text-center bg-slate-900 border-slate-700 focus-visible:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {formatCurrency(financials.installmentValue)}
                    </TableCell>
                    <TableCell className="text-right text-slate-500 text-xs font-mono">
                      {financials.endDate}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-white/10 bg-slate-950">
          <div className="flex items-center justify-between w-full">
            <div className="text-slate-400 text-sm">
              <span className="text-white font-medium">{selectedCount}</span>{" "}
              usuários selecionados
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="hover:bg-slate-800 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || selectedCount === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Atribuição
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
