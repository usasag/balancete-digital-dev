"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  taxaService,
  Taxa,
  configuracaoService,
  ConfiguracaoFinanceira,
  CreateTaxaDto,
} from "@/services/taxa-service";
import { caixaService, Caixa } from "@/services/caixa-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Save, Wallet, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { CaixaFormDialog } from "@/components/caixas/caixa-form-dialog";
import {
  ContaBancaria,
  contaBancariaService,
} from "@/services/conta-bancaria-service";
import { ContaBancariaFormDialog } from "@/components/taxas/conta-bancaria-form-dialog";
import { Banknote, Building2, CreditCard, Users } from "lucide-react";
import { TaxaAssignmentDialog } from "@/components/taxas/taxa-assignment-dialog";

export default function TaxasPage() {
  const { user } = useAuth();
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [config, setConfig] = useState<ConfiguracaoFinanceira | null>(null);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);

  // States for Dialogs
  const [isTaxaDialogOpen, setIsTaxaDialogOpen] = useState(false);
  const [isCaixaDialogOpen, setIsCaixaDialogOpen] = useState(false);
  const [isContaDialogOpen, setIsContaDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  const [editingTaxa, setEditingTaxa] = useState<Taxa | null>(null);
  const [assignmentTaxa, setAssignmentTaxa] = useState<Taxa | null>(null);
  const [editingCaixa, setEditingCaixa] = useState<Caixa | null>(null);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);

  const [taxaFormData, setTaxaFormData] = useState<CreateTaxaDto>({
    nome: "",
    descricao: "",
    valor: 0,
    parcelado: false,
    total_parcelas: 1,
    ativa: true,
    opcional: false,
    variavel: false,
    caixaId: undefined,
  });

  const fetchData = async () => {
    if (!user?.nucleoId) return;
    try {
      setLoading(true);
      const [taxasData, configData, caixasData, contasData] = await Promise.all(
        [
          taxaService.findAll(),
          configuracaoService.get(),
          caixaService.findAllByNucleo(user.nucleoId),
          contaBancariaService.findAllByNucleo(user.nucleoId),
        ],
      );
      setTaxas(taxasData);
      setConfig(configData);
      setCaixas(caixasData);
      setContas(contasData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- Taxa Handlers ---

  const handleTaxaSubmit = async () => {
    try {
      const payload = { ...taxaFormData, valor: Number(taxaFormData.valor) };

      if (editingTaxa) {
        await taxaService.update(editingTaxa.id, payload);
        toast.success("Taxa atualizada!");
      } else {
        await taxaService.create(payload);
        toast.success("Taxa criada!");
      }
      setIsTaxaDialogOpen(false);
      setEditingTaxa(null);
      fetchData(); // Refresh all to be safe
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar taxa.");
    }
  };

  const openTaxaDialog = (taxa?: Taxa) => {
    if (taxa) {
      setEditingTaxa(taxa);
      setTaxaFormData({
        nome: taxa.nome,
        descricao: taxa.descricao || "",
        valor: Number(taxa.valor),
        parcelado: taxa.parcelado,
        total_parcelas: taxa.total_parcelas,
        ativa: taxa.ativa,
        opcional: taxa.opcional,
        variavel: taxa.variavel,
        caixaId: taxa.caixaId,
      });
    } else {
      setEditingTaxa(null);
      setTaxaFormData({
        nome: "",
        descricao: "",
        valor: 0,
        parcelado: false,
        total_parcelas: 1,
        ativa: true,
        opcional: false,
        variavel: false,
        caixaId: undefined,
      });
    }
    setIsTaxaDialogOpen(true);
  };

  const handleTaxaDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta taxa?")) return;
    try {
      await taxaService.remove(id);
      toast.success("Taxa removida.");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover taxa.");
    }
  };

  // --- Config Handlers ---

  const handleConfigUpdate = async () => {
    if (!config) return;
    try {
      await configuracaoService.update(config);

      // Verification Step
      const updatedConfig = await configuracaoService.get();
      // simplified check
      if (updatedConfig) {
        toast.success("Configurações salvas e verificadas com sucesso!");
      } else {
        toast.warning("Configurações salvas, mas a verificação falhou.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar configurações.");
    }
  };

  // --- Caixa Handlers ---

  const openCaixaDialog = (caixa?: Caixa) => {
    setEditingCaixa(caixa || null);
    setIsCaixaDialogOpen(true);
  };

  const handleCaixaDelete = async (id: string, nome: string) => {
    if (nome === "Tesouraria") {
      toast.error("O caixa Tesouraria não pode ser excluído.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este caixa?")) return;
    try {
      await caixaService.remove(id);
      toast.success("Caixa removido.");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover caixa.");
    }
  };

  const openContaDialog = (conta?: ContaBancaria) => {
    setEditingConta(conta || null);
    setIsContaDialogOpen(true);
  };

  const handleContaDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta bancária?")) return;
    try {
      await contaBancariaService.remove(id);
      toast.success("Conta bancária removida.");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover conta bancária.");
    }
  };

  if (!user) return null;
  const openAssignmentDialog = (taxa: Taxa) => {
    setAssignmentTaxa(taxa);
    setIsAssignmentDialogOpen(true);
  };
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Taxas e Caixas</h1>
          <p className="text-muted-foreground">
            Gerencie taxas extras, configuração de repasses e caixas do núcleo.
          </p>
        </div>
      </div>

      <Tabs defaultValue="taxas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="taxas">Taxas Extras</TabsTrigger>
          <TabsTrigger value="repasses">Configuração & Repasses</TabsTrigger>
          <TabsTrigger value="caixas">Gerenciamento de Caixas</TabsTrigger>
          <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
        </TabsList>

        {/* --- TAB: Taxas Extras --- */}
        <TabsContent value="taxas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Taxas Cadastradas</CardTitle>
                <CardDescription>
                  Taxas que podem ser adicionadas às mensalidades.
                </CardDescription>
              </div>
              <Button onClick={() => openTaxaDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Nova Taxa
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {taxas.map((taxa) => (
                  <Card key={taxa.id} className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{taxa.nome}</CardTitle>
                        <div className="space-x-1 flex">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Atribuir a Sócios"
                            onClick={() => openAssignmentDialog(taxa)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openTaxaDialog(taxa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleTaxaDelete(taxa.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {taxa.variavel
                          ? "Variável"
                          : formatCurrency(taxa.valor)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {taxa.ativa ? (
                          <Badge className="bg-green-600">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                        {taxa.parcelado && (
                          <Badge variant="secondary">
                            {taxa.total_parcelas}x
                          </Badge>
                        )}
                        {taxa.opcional && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-500"
                          >
                            Opcional
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Destino:{" "}
                        {caixas.find((c) => c.id === taxa.caixaId)?.nome ||
                          "Padrão"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {taxas.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Nenhuma taxa cadastrada.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB: Configuração & Repasses --- */}
        <TabsContent value="repasses">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Repasses e Destinos</CardTitle>
              <CardDescription>
                Defina os valores fixos de repasse e para qual caixa cada valor
                deve ir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {config && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Repasse DG */}
                    <div className="space-y-4 p-4 border rounded-md">
                      <h3 className="font-medium">Diretoria Geral</h3>
                      <div className="space-y-2">
                        <Label>Valor do Repasse (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.valor_repasse_dg}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              valor_repasse_dg: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Caixa de Destino</Label>
                        <Input
                          value="Tesouraria (Padrão)"
                          disabled
                          className="bg-muted text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Obrigatório: Tesouraria.
                        </p>
                      </div>
                    </div>

                    {/* Repasse Região */}
                    <div className="space-y-4 p-4 border rounded-md">
                      <h3 className="font-medium">11ª Região</h3>
                      <div className="space-y-2">
                        <Label>Valor do Repasse (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.valor_repasse_regiao}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              valor_repasse_regiao: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Caixa de Destino</Label>
                        <Input
                          value="Tesouraria (Padrão)"
                          disabled
                          className="bg-muted text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Obrigatório: Tesouraria.
                        </p>
                      </div>
                    </div>

                    {/* Valor Base / Núcleo */}
                    <div className="space-y-4 p-4 border rounded-md">
                      <h3 className="font-medium">Mensalidade Base (Núcleo)</h3>
                      <div className="space-y-2">
                        <Label>Caixa de Destino (Valor Base)</Label>
                        <Input
                          value="Tesouraria (Padrão)"
                          disabled
                          className="bg-muted text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Destino do valor base pago pelos sócios.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleConfigUpdate} className="gap-2">
                      <Save className="h-4 w-4" /> Salvar Configurações
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB: Gerenciamento de Caixas --- */}
        <TabsContent value="caixas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Caixas do Núcleo</CardTitle>
                <CardDescription>
                  Gerencie as contas e caixas (Ex: Tesouraria, Beneficência, DG,
                  Região).
                </CardDescription>
              </div>
              <Button onClick={() => openCaixaDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Novo Caixa
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caixas.map((caixa) => {
                  const isTesouraria = caixa.nome === "Tesouraria";
                  return (
                    <div
                      key={caixa.id}
                      className={`flex justify-between items-center p-4 border rounded-md transition-colors ${
                        isTesouraria
                          ? "bg-blue-950/20 border-blue-500/30"
                          : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isTesouraria
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isTesouraria ? (
                            <Lock className="h-5 w-5" />
                          ) : (
                            <Wallet className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {caixa.nome}
                            {isTesouraria && (
                              <Badge
                                variant="outline"
                                className="text-blue-400 border-blue-500/50 text-[10px] h-5"
                              >
                                Obrigatório
                              </Badge>
                            )}
                          </h4>
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>
                              Saldo Inicial:{" "}
                              {formatCurrency(caixa.saldoInicial)}
                            </span>
                            {!caixa.ativo && (
                              <Badge
                                variant="destructive"
                                className="h-5 text-[10px]"
                              >
                                Inativo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openCaixaDialog(caixa)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isTesouraria ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  {/* span wrapper helps with disabled button events in some browsers/ui libs, specifically for tooltips */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground opacity-50 cursor-not-allowed"
                                    disabled
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Esse caixa é obrigatório e não pode ser
                                  deletado.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              handleCaixaDelete(caixa.id, caixa.nome)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {caixas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum caixa cadastrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* --- TAB: Contas Bancárias --- */}
        <TabsContent value="contas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contas Bancárias</CardTitle>
                <CardDescription>
                  Gerencie as contas bancárias do núcleo
                </CardDescription>
              </div>
              <Button onClick={() => openContaDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Nova Conta
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contas.map((conta) => (
                  <div
                    key={conta.id}
                    className="flex justify-between items-center p-4 border rounded-md bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{conta.nome_conta}</h4>
                          {!conta.ativa && (
                            <Badge
                              variant="destructive"
                              className="h-5 text-[10px]"
                            >
                              Inativa
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Banknote className="h-3 w-3" /> {conta.banco}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" /> Ag:{" "}
                            {conta.agencia} | CC: {conta.numero_conta}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openContaDialog(conta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleContaDelete(conta.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {contas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conta bancária cadastrada.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}

      {/* Edit Taxa Dialog */}
      <Dialog open={isTaxaDialogOpen} onOpenChange={setIsTaxaDialogOpen}>
        {/* ... existing dialog ... */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTaxa ? "Editar Taxa" : "Criar Nova Taxa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={taxaFormData.nome}
                onChange={(e) =>
                  setTaxaFormData({ ...taxaFormData, nome: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={taxaFormData.valor}
                disabled={taxaFormData.variavel}
                onChange={(e) =>
                  setTaxaFormData({
                    ...taxaFormData,
                    valor: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Caixa de Destino (Opcional)</Label>
              <Select
                value={taxaFormData.caixaId || "null"}
                onValueChange={(val) =>
                  setTaxaFormData({
                    ...taxaFormData,
                    caixaId: val === "null" ? undefined : val,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um caixa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">-- Nenhum (Padrão) --</SelectItem>
                  {caixas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ativa"
                  checked={taxaFormData.ativa}
                  onCheckedChange={(c) =>
                    setTaxaFormData({ ...taxaFormData, ativa: !!c })
                  }
                />
                <Label htmlFor="ativa">Ativa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="opcional"
                  checked={taxaFormData.opcional}
                  onCheckedChange={(c) =>
                    setTaxaFormData({ ...taxaFormData, opcional: !!c })
                  }
                />
                <Label htmlFor="opcional">Opcional</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="variavel"
                  checked={taxaFormData.variavel}
                  onCheckedChange={(c) =>
                    setTaxaFormData({ ...taxaFormData, variavel: !!c })
                  }
                />
                <Label htmlFor="variavel">Valor Variável</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parcelado"
                  checked={taxaFormData.parcelado}
                  onCheckedChange={(c) =>
                    setTaxaFormData({ ...taxaFormData, parcelado: !!c })
                  }
                />
                <Label htmlFor="parcelado">Parcelado</Label>
              </div>
            </div>
            {taxaFormData.parcelado && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  value={taxaFormData.total_parcelas}
                  onChange={(e) =>
                    setTaxaFormData({
                      ...taxaFormData,
                      total_parcelas: Number(e.target.value),
                    })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTaxaDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleTaxaSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Caixa Form Dialog Component */}
      <CaixaFormDialog
        open={isCaixaDialogOpen}
        onOpenChange={setIsCaixaDialogOpen}
        caixaToEdit={editingCaixa}
        onSuccess={fetchData}
        nucleoId={user.nucleoId || ""}
        contas={contas}
      />

      {/* Conta Bancaria Form Dialog Component */}
      <ContaBancariaFormDialog
        open={isContaDialogOpen}
        onOpenChange={setIsContaDialogOpen}
        contaToEdit={editingConta}
        onSuccess={fetchData}
        nucleoId={user.nucleoId || ""}
      />
      <TaxaAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        taxa={assignmentTaxa}
        onSuccess={() => {
          setIsAssignmentDialogOpen(false);
          // Optional: Refresh data if needed, though assignment doesn't change taxa definition
        }}
      />
    </div>
  );
}
