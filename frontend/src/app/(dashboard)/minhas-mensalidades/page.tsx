"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  mensalidadeService,
  Mensalidade,
} from "@/services/mensalidade-service";
import {
  configuracaoService,
  ConfiguracaoFinanceira,
} from "@/services/taxa-service";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MensalidadeSlip } from "@/components/mensalidade-slip";
import { BoletoView } from "@/components/boleto-view";
import { formatCurrency } from "@/lib/utils";
import { MoreHorizontal, Printer, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MinhasMensalidades() {
  const { user } = useAuth();
  const [myMensalidades, setMyMensalidades] = useState<Mensalidade[]>([]);
  const [config, setConfig] = useState<ConfiguracaoFinanceira | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialog States
  const [boletoDialog, setBoletoDialog] = useState<Mensalidade | null>(null);
  const [slipDialog, setSlipDialog] = useState<Mensalidade | null>(null);

  const fetchMensalidades = useCallback(async () => {
    if (!user?.nucleoId) return;
    setLoading(true);
    try {
      const [configData, allData] = await Promise.all([
        configuracaoService.get(),
        mensalidadeService.findAllByNucleo(user.nucleoId),
      ]);

      setConfig(configData);

      // Filter for own mensualidades
      // Assuming allData returns everything, we filter by socioId = user.backendId
      if (user.backendId) {
        setMyMensalidades(allData.filter((m) => m.socioId === user.backendId));
      } else {
        // Fallback if backendId is missing
        setMyMensalidades([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMensalidades();
  }, [fetchMensalidades]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAGO":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "PENDENTE":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      case "ATRASADO":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "INADIMPLENTE":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Minhas Mensalidades
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Financeiro</CardTitle>
          <CardDescription>Acompanhe suas contribuições.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myMensalidades.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.mes_referencia}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(item.status)}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.valor_total || item.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSlipDialog(item)}>
                            <FileText className="mr-2 h-4 w-4" /> Ver Detalhes
                          </DropdownMenuItem>
                          {item.status !== "PAGO" && (
                            <DropdownMenuItem
                              onClick={() => setBoletoDialog(item)}
                            >
                              <FileText className="mr-2 h-4 w-4" /> Gerar Boleto
                            </DropdownMenuItem>
                          )}
                          {item.status === "PAGO" && (
                            <DropdownMenuItem
                              onClick={() => setBoletoDialog(item)}
                            >
                              <FileText className="mr-2 h-4 w-4" /> Ver Boleto
                              (Pago)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && myMensalidades.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center h-24 text-muted-foreground"
                    >
                      Nenhuma mensalidade encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* BOLETO DIALOG */}
      <Dialog
        open={!!boletoDialog}
        onOpenChange={(open) => !open && setBoletoDialog(null)}
      >
        <DialogContent className="max-w-[900px] w-full p-6 bg-white overflow-y-auto max-h-[95vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-black font-bold text-xl">
              Boleto Bancário
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="print:hidden gap-2 text-black/80 border-slate-300 hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </DialogHeader>

          {boletoDialog && (
            <div className="printable-boleto transform scale-100 origin-top">
              <BoletoView
                vencimento={
                  boletoDialog.data_vencimento
                    ? new Date(boletoDialog.data_vencimento).toLocaleDateString(
                        "pt-BR",
                      )
                    : "A VISTA"
                }
                valor={Number(boletoDialog.valor_total || boletoDialog.valor)}
                pagador={{
                  nome: boletoDialog.socio?.nomeCompleto || "Sócio",
                  documento: "000.000.000-00",
                  endereco: "Endereço do Sócio",
                }}
                beneficiario={{
                  nome: "Centro Espírita Beneficente União do Vegetal",
                  documento: "28.227.134/0001-69",
                  endereco: "Rua Exemplo, 123",
                }}
                nossoNumero={`000${boletoDialog.id.substring(0, 8)}`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SLIP DIALOG */}
      <Dialog
        open={!!slipDialog}
        onOpenChange={(open) => !open && setSlipDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Demonstrativo de Mensalidade</DialogTitle>
          </DialogHeader>
          {slipDialog && (
            <MensalidadeSlip
              socioName={slipDialog.socio?.nomeCompleto || "Sócio"}
              mesReferencia={slipDialog.mes_referencia}
              valorBase={Number(slipDialog.valor_base)}
              dataVencimento={slipDialog.data_vencimento || ""}
              itens={slipDialog.itens || []}
              taxaExtra={slipDialog.taxa_extra}
              valorTotal={Number(slipDialog.valor_total || slipDialog.valor)}
              status={slipDialog.status}
              config={config}
              hidePix={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
