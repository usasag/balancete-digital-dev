"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { mensalidadeService, TaxaExtra } from "@/services/mensalidade-service";
import { taxaService, Taxa } from "@/services/taxa-service";
import { caixaService, Caixa } from "@/services/caixa-service";
import api from "@/services/api"; // To fetch users
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface UsuarioSimple {
  id: string;
  nomeCompleto: string;
  valor_base?: number;
}

export default function NovaMensalidade() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [socios, setSocios] = useState<UsuarioSimple[]>([]);
  const [taxasDisponiveis, setTaxasDisponiveis] = useState<Taxa[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [selectedTaxas, setSelectedTaxas] = useState<string[]>([]);
  // Store selected optional taxes
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);

  // Store custom configuration for each selected tax: { [taxaId]: { parcela_atual, valor_parcela } }
  const [customTaxas, setCustomTaxas] = useState<
    Record<string, { parcela_atual: number; valor_parcela: number }>
  >({});

  // Store values for optional taxes: { [taxaId]: value }
  const [optionalTaxasValues, setOptionalTaxasValues] = useState<
    Record<string, number>
  >({});

  const [formData, setFormData] = useState({
    socioId: "",
    valor_base: "",
    mes_referencia: new Date().toISOString().slice(0, 7), // YYYY-MM
    status: "PENDENTE" as "PENDENTE" | "PAGO",
    caixaId: "",
  });

  useEffect(() => {
    // Fetch socios and taxas
    const fetchData = async () => {
      if (!user?.nucleoId) return;
      try {
        const [sociosRes, taxasRes, caixasRes] = await Promise.all([
          api.get<UsuarioSimple[]>(`/usuarios/nucleo/${user.nucleoId}`),
          taxaService.findAll(),
          caixaService.findAllByNucleo(user.nucleoId),
        ]);
        setSocios(sociosRes.data);
        // We no longer init optional values to 0 here to keep them "unselected" by default
        setTaxasDisponiveis(taxasRes);
        setCaixas(caixasRes);

        // Find default "Tesouraria"
        const tesouraria = caixasRes.find((c) => c.nome === "Tesouraria");
        if (tesouraria) {
          setFormData((prev) => ({ ...prev, caixaId: tesouraria.id }));
        } else if (caixasRes.length > 0) {
          setFormData((prev) => ({ ...prev, caixaId: caixasRes[0].id }));
        }
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    fetchData();
  }, [user]);

  const handleTaxaToggle = (taxaId: string) => {
    setSelectedTaxas((prev) =>
      prev.includes(taxaId)
        ? prev.filter((id) => id !== taxaId)
        : [...prev, taxaId],
    );
    // Cleanup custom config if unselected? Optional, but cleaner.
    if (selectedTaxas.includes(taxaId)) {
      const newCustom = { ...customTaxas };
      delete newCustom[taxaId];
      setCustomTaxas(newCustom);
    }
  };

  const handleOptionalToggle = (taxa: Taxa) => {
    const isSelected = selectedOptional.includes(taxa.id);
    if (isSelected) {
      // Uncheck
      setSelectedOptional((prev) => prev.filter((id) => id !== taxa.id));
      // Optional: clear value? Not strictly necessary but clean
      const newValues = { ...optionalTaxasValues };
      delete newValues[taxa.id];
      setOptionalTaxasValues(newValues);
    } else {
      // Check
      setSelectedOptional((prev) => [...prev, taxa.id]);
      // Set default value from registered taxa
      setOptionalTaxasValues((prev) => ({
        ...prev,
        [taxa.id]: Number(taxa.valor),
      }));
    }
  };

  const handleCustomChange = (
    taxaId: string,
    field: "parcela_atual" | "valor_parcela",
    value: number,
  ) => {
    setCustomTaxas((prev) => ({
      ...prev,
      [taxaId]: {
        ...prev[taxaId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.nucleoId) return;

    setLoading(true);
    try {
      const [year, month] = formData.mes_referencia.split("-");
      const formattedMonth = `${month}/${year}`;

      // Build taxa_extra array from selected IDs
      const taxasExtrasPayload: TaxaExtra[] = selectedTaxas
        .map((id) => {
          const taxa = taxasDisponiveis.find((t) => t.id === id);
          if (!taxa) return null;

          const isCustom = !!customTaxas[id];
          const customData = customTaxas[id];

          let defaultValorParcela = 0;
          if (taxa.variavel) {
            // For variable taxes, default to 0 if not custom
            defaultValorParcela = 0;
          } else {
            defaultValorParcela = taxa.parcelado
              ? Number(taxa.valor) / taxa.total_parcelas
              : Number(taxa.valor);
          }

          return {
            descricao: taxa.nome,
            valor_total:
              taxa.variavel && isCustom
                ? customData.valor_parcela
                : Number(taxa.valor), // approximate total for variable
            parcela_atual: isCustom ? customData.parcela_atual : 1,
            total_parcelas: taxa.parcelado ? taxa.total_parcelas : 1,
            valor_parcela: isCustom
              ? customData.valor_parcela
              : defaultValorParcela,
          };
        })
        .filter((t): t is TaxaExtra => t !== null);

      // Build itens from optional taxes (ONLY SELECTED)
      const optionalItens = taxasDisponiveis
        .filter((t) => t.opcional && selectedOptional.includes(t.id))
        .map((t) => ({
          nome: t.nome,
          valor: optionalTaxasValues[t.id] || 0,
          obrigatorio: false, // Optional taxes are... optional
          selecionado: true,
        }));

      await mensalidadeService.create({
        ...formData,
        mes_referencia: formattedMonth,
        valor_base: parseFloat(formData.valor_base),
        nucleoId: user.nucleoId,
        itens: optionalItens,
        taxa_extra: taxasExtrasPayload,
        caixaId: formData.caixaId,
      });
      router.push("/mensalidades");
    } catch (error) {
      console.error(error);
      alert("Erro ao criar mensalidade.");
    } finally {
      setLoading(false);
    }
  };

  const taxasNormais = taxasDisponiveis.filter((t) => !t.opcional);
  const taxasOpcionais = taxasDisponiveis.filter((t) => t.opcional);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nova Mensalidade</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Cobrança</CardTitle>
          <CardDescription>Gere uma mensalidade para um sócio.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caixa">Caixa de Destino</Label>
              <select
                id="caixa"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={formData.caixaId}
                onChange={(e) =>
                  setFormData({ ...formData, caixaId: e.target.value })
                }
              >
                <option value="">Selecione o Caixa...</option>
                {caixas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="socio">Sócio</Label>
              <select
                id="socio"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={formData.socioId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const socio = socios.find((s) => s.id === selectedId);
                  setFormData({
                    ...formData,
                    socioId: selectedId,
                    valor_base: socio?.valor_base?.toString() || "",
                  });
                }}
              >
                <option value="">Selecione um sócio...</option>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor Base (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                required
                readOnly
                className="bg-secondary/50 font-semibold cursor-not-allowed border-dashed focus-visible:ring-0"
                value={formData.valor_base}
                tabIndex={-1}
              />
              <p className="text-xs text-muted-foreground">
                Valor da mensalidade antes das taxas.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <Label>Taxas Extras</Label>
              {taxasNormais.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma taxa cadastrada.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {taxasNormais.map((taxa) => {
                    const isSelected = selectedTaxas.includes(taxa.id);
                    const isParcelado = taxa.parcelado; // && taxa.total_parcelas > 1;
                    const isCustom = !!customTaxas[taxa.id];
                    // Auto-expand custom if variable and selected
                    const showCustom =
                      isSelected && (isParcelado || taxa.variavel);

                    return (
                      <div
                        key={taxa.id}
                        className={`border rounded-md transition-all ${
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center space-x-2 p-3">
                          <Checkbox
                            id={taxa.id}
                            checked={isSelected}
                            onCheckedChange={() => handleTaxaToggle(taxa.id)}
                          />
                          <Label
                            htmlFor={taxa.id}
                            className="flex-1 flex justify-between items-center cursor-pointer"
                          >
                            <span>{taxa.nome}</span>
                            <div className="flex items-center gap-2">
                              {taxa.variavel ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500 text-amber-500"
                                >
                                  Variável
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  R$ {Number(taxa.valor).toFixed(2)}
                                </Badge>
                              )}

                              {taxa.parcelado && (
                                <Badge variant="secondary">
                                  {taxa.total_parcelas}x
                                </Badge>
                              )}
                            </div>
                          </Label>
                        </div>

                        {showCustom && (
                          <div className="px-3 pb-3 pt-0 space-y-3">
                            <div className="flex items-center space-x-2">
                              {!taxa.variavel && ( // Only show checkbox if NOT variable (variable forces custom)
                                <>
                                  <Checkbox
                                    id={`custom-${taxa.id}`}
                                    checked={isCustom}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        // Init defaults
                                        setCustomTaxas((prev) => ({
                                          ...prev,
                                          [taxa.id]: {
                                            parcela_atual: 1,
                                            valor_parcela:
                                              Number(taxa.valor) /
                                              taxa.total_parcelas,
                                          },
                                        }));
                                      } else {
                                        // Remove custom config
                                        const newCustom = { ...customTaxas };
                                        delete newCustom[taxa.id];
                                        setCustomTaxas(newCustom);
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`custom-${taxa.id}`}
                                    className="text-xs font-normal text-muted-foreground cursor-pointer"
                                  >
                                    Personalizar parcela nesta mensalidade
                                  </Label>
                                </>
                              )}
                              {taxa.variavel && !isCustom && (
                                // Force init custom for variable
                                <div className="text-xs text-amber-600 font-medium">
                                  Informe o valor desta taxa variável:
                                </div>
                              )}
                            </div>

                            {(isCustom || taxa.variavel) && (
                              <div className="grid grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                  <Label
                                    className="text-xs"
                                    htmlFor={`p-idx-${taxa.id}`}
                                  >
                                    Parcela Atual
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`p-idx-${taxa.id}`}
                                      type="number"
                                      min={1}
                                      max={taxa.total_parcelas}
                                      className="h-8 text-xs"
                                      value={
                                        customTaxas[taxa.id]?.parcela_atual || 1
                                      }
                                      onChange={(e) =>
                                        handleCustomChange(
                                          taxa.id,
                                          "parcela_atual",
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      de {taxa.total_parcelas}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label
                                    className="text-xs"
                                    htmlFor={`p-val-${taxa.id}`}
                                  >
                                    Valor (R$) (
                                    {taxa.variavel
                                      ? "Se variável, deixe em branco"
                                      : ""}
                                    )
                                  </Label>
                                  <Input
                                    id={`p-val-${taxa.id}`}
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-xs"
                                    value={
                                      customTaxas[taxa.id]?.valor_parcela || ""
                                    }
                                    onFocus={() => {
                                      // Auto-init for variable if focusing
                                      if (
                                        taxa.variavel &&
                                        !customTaxas[taxa.id]
                                      ) {
                                        handleCustomChange(
                                          taxa.id,
                                          "valor_parcela",
                                          0,
                                        );
                                      }
                                    }}
                                    onChange={(e) =>
                                      handleCustomChange(
                                        taxa.id,
                                        "valor_parcela",
                                        parseFloat(e.target.value),
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {taxasOpcionais.length > 0 && (
              <div className="space-y-4 pt-2 border-t mt-4">
                <Label>Taxas Opcionais (Contribuição Voluntária)</Label>
                <div className="grid grid-cols-1 gap-2">
                  {taxasOpcionais.map((taxa) => {
                    const isSelected = selectedOptional.includes(taxa.id);
                    return (
                      <div
                        key={taxa.id}
                        className={`flex flex-col space-y-2 border p-3 rounded-md transition-all ${
                          isSelected
                            ? "bg-muted/20 border-primary/50"
                            : "bg-transparent border-input"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`opt-${taxa.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleOptionalToggle(taxa)}
                          />
                          <Label
                            htmlFor={`opt-${taxa.id}`}
                            className="flex-1 font-medium cursor-pointer"
                          >
                            {taxa.nome}
                          </Label>
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            Sugerido: {formatCurrency(taxa.valor)}
                          </Badge>
                        </div>

                        {isSelected && (
                          <div className="pl-7 animate-in slide-in-from-top-1 duration-200">
                            <Label className="text-xs mb-1 block">
                              Valor da Contribuição (R$)
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              className="h-9"
                              value={optionalTaxasValues[taxa.id] ?? 0}
                              onChange={(e) =>
                                setOptionalTaxasValues((prev) => ({
                                  ...prev,
                                  [taxa.id]: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mes">Mês de Referência</Label>
              <Input
                id="mes"
                type="month"
                required
                value={formData.mes_referencia}
                onChange={(e) =>
                  setFormData({ ...formData, mes_referencia: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Situação Inicial</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "PENDENTE" | "PAGO",
                  })
                }
              >
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Gerar Mensalidade"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
