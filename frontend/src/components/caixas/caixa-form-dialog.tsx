import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Caixa, caixaService } from "@/services/caixa-service";
import { ContaBancaria } from "@/services/conta-bancaria-service";

interface CaixaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixaToEdit?: Caixa | null;
  onSuccess: () => void;
  nucleoId: string;
  contas: ContaBancaria[];
}

export function CaixaFormDialog({
  open,
  onOpenChange,
  caixaToEdit,
  onSuccess,
  nucleoId,
  contas,
}: CaixaFormDialogProps) {
  const [nome, setNome] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("0");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);

  // Distribution State
  const [distEmDinheiro, setDistEmDinheiro] = useState("0");
  const [distOutros, setDistOutros] = useState("0");
  const [distContas, setDistContas] = useState<Record<string, string>>({});

  // Filter active accounts
  const activeContas = contas.filter((c) => c.ativa);

  useEffect(() => {
    if (caixaToEdit) {
      setNome(caixaToEdit.nome);
      setSaldoInicial(String(caixaToEdit.saldoInicial));
      setAtivo(caixaToEdit.ativo);

      // Load existing distribution if available
      if (caixaToEdit.distribuicaoInicial) {
        setDistEmDinheiro(
          String(caixaToEdit.distribuicaoInicial.dinheiro || 0),
        );
        setDistOutros(String(caixaToEdit.distribuicaoInicial.outros || 0));

        const contasMap: Record<string, string> = {};
        if (caixaToEdit.distribuicaoInicial.contas) {
          Object.entries(caixaToEdit.distribuicaoInicial.contas).forEach(
            ([k, v]) => {
              contasMap[k] = String(v);
            },
          );
        }
        setDistContas(contasMap);
      } else {
        // Fallback for legacy records: try to infer from contaBancariaId or reset
        setDistEmDinheiro("0");
        setDistOutros("0");
        setDistContas({});
      }
    } else {
      setNome("");
      setSaldoInicial("0");
      setAtivo(true);
      setDistEmDinheiro("0");
      setDistOutros("0");
      setDistContas({});
    }
  }, [caixaToEdit, open]);

  // Calculate totals
  const totalSaldo = Number(saldoInicial) || 0;
  const totalDinheiro = Number(distEmDinheiro) || 0;
  const totalOutros = Number(distOutros) || 0;
  const totalContas = Object.values(distContas).reduce(
    (acc, val) => acc + (Number(val) || 0),
    0,
  );

  const totalDistribuido = totalDinheiro + totalContas + totalOutros;
  const diferenca = totalSaldo - totalDistribuido;
  const isValid = Math.abs(diferenca) < 0.01; // float tolerance

  const handleContaChange = (contaId: string, val: string) => {
    setDistContas((prev) => ({ ...prev, [contaId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast.error("A distribuição deve ser igual ao Saldo Inicial.");
      return;
    }

    setLoading(true);
    try {
      // Prepare distribution object
      const distribuicaoInicial = {
        dinheiro: Number(distEmDinheiro),
        outros: Number(distOutros),
        contas: Object.fromEntries(
          Object.entries(distContas).map(([k, v]) => [k, Number(v)]),
        ),
      };

      const data = {
        nome,
        saldoInicial: Number(saldoInicial),
        ativo,
        nucleoId,
        distribuicaoInicial,
        // clear old fields if strict, but maybe keep for legacy compat?
        // Backend entity has nullable contaBancariaId, we can leave it null or undefined.
        contaBancariaId: undefined,
      };

      if (caixaToEdit) {
        await caixaService.update(caixaToEdit.id, data);
        toast.success("Caixa atualizado com sucesso!");
      } else {
        await caixaService.create(data);
        toast.success("Caixa criado com sucesso!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar caixa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {caixaToEdit ? "Editar Caixa" : "Novo Caixa"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saldo">Saldo Inicial Total</Label>
              <Input
                id="saldo"
                type="number"
                step="0.01"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                required
                className="font-bold"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativo"
              checked={ativo}
              onCheckedChange={(checked) => setAtivo(checked === true)}
            />
            <Label htmlFor="ativo">Ativo</Label>
          </div>

          {/* Distribution Section */}
          <div className="border rounded-md p-4 bg-muted/20 space-y-4">
            <h3 className="font-medium text-sm text-foreground">
              Distribuição de Fundos (Obrigatório)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distDinheiro" className="text-xs">
                  Dinheiro em Espécie
                </Label>
                <Input
                  id="distDinheiro"
                  type="number"
                  step="0.01"
                  value={distEmDinheiro}
                  onChange={(e) => setDistEmDinheiro(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distOutros" className="text-xs">
                  Outros
                </Label>
                <Input
                  id="distOutros"
                  type="number"
                  step="0.01"
                  value={distOutros}
                  onChange={(e) => setDistOutros(e.target.value)}
                />
              </div>
            </div>

            {/* Bank Accounts */}
            {activeContas.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Contas Bancárias</Label>
                {activeContas.map((conta) => (
                  <div key={conta.id} className="flex items-center space-x-2">
                    <span
                      className="text-xs w-1/3 whitespace-normal break-words leading-tight"
                      title={`${conta.nome_conta} - ${conta.banco}`}
                    >
                      {conta.nome_conta} ({conta.banco})
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      className="flex-1 h-8 text-sm"
                      placeholder="0.00"
                      value={distContas[conta.id] || ""}
                      onChange={(e) =>
                        handleContaChange(conta.id, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Validation Feedback */}
            <div className="pt-2 border-t flex justify-between items-center text-sm">
              <span>
                Distribuído:{" "}
                <strong>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalDistribuido)}
                </strong>
              </span>
              <span
                className={
                  diferenca === 0
                    ? "text-green-600 font-bold"
                    : "text-red-500 font-bold"
                }
              >
                {diferenca === 0
                  ? "OK"
                  : `Diferença: ${new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(diferenca)}`}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isValid}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
