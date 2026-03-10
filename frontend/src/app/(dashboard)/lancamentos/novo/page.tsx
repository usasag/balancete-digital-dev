"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { lancamentoService } from "@/services/lancamento-service";
import { caixaService, Caixa } from "@/services/caixa-service"; // Import CaixaService
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
import { ArrowLeft } from "lucide-react";

export default function NovoLancamento() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    subcategoria: "",
    observacao: "",
    data_movimento: new Date().toISOString().split("T")[0],
    tipo: "DESPESA" as "RECEITA" | "DESPESA",
    caixaId: "",
    status: "RASCUNHO" as "RASCUNHO" | "REGISTRADO",
  });

  useEffect(() => {
    if (user?.nucleoId) {
      caixaService
        .findAllByNucleo(user.nucleoId)
        .then(setCaixas)
        .catch(console.error);
    }
  }, [user?.nucleoId]);

  // Effect to handle status change based on conditions
  useEffect(() => {
    if (formData.tipo === "DESPESA") {
      // Logic: If user *wants* REGISTRADO, they must have proof.
      // But we generally just default to RASCUNHO unless proof is added.
      // If proof is added, we can suggest or auto-switch?
      // Requirement: "Automatically setting the status to 'Rascunho' ... if a fiscal evidence is not provided."
      // So if no file, force RASCUNHO.
      if (!file && formData.status === "REGISTRADO") {
        setFormData((prev) => ({ ...prev, status: "RASCUNHO" }));
      }
    }
  }, [file, formData.tipo, formData.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Optional: Auto-set to REGISTRADO if all other fields are present?
      // Let's just allow the user to select REGISTRADO now.
      setFormData((prev) => ({ ...prev, status: "REGISTRADO" }));
    } else {
      setFile(null);
      setFormData((prev) => ({ ...prev, status: "RASCUNHO" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.nucleoId || !user?.backendId) return;

    setLoading(true);
    try {
      await lancamentoService.create({
        ...formData,
        valor: parseFloat(formData.valor),
        nucleoId: user.nucleoId,
        criadoPorId: user.backendId!,
        caixaId: formData.caixaId || undefined,
      }, file || undefined);
      router.push("/lancamentos");
    } catch (error) {
      console.error(error);
      alert(
        "Erro ao criar lançamento. Verifique se todos os campos obrigatórios estão preenchidos.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Novo Lançamento</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimento Financeiro</CardTitle>
          <CardDescription>
            Adicione uma nova receita ou despesa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caixa">Caixa</Label>
                <select
                  id="caixa"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.caixaId}
                  onChange={(e) =>
                    setFormData({ ...formData, caixaId: e.target.value })
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  {caixas.map((caixa) => (
                    <option key={caixa.id} value={caixa.id}>
                      {caixa.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo: e.target.value as "RECEITA" | "DESPESA",
                    })
                  }
                >
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
              </div>

              {/* ... Categories ... */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <select
                  id="categoria"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={
                    [
                      "Mensalidade",
                      "Doação",
                      "Evento",
                      "Energia",
                      "Água",
                      "Comunicação",
                      "Manutenção",
                      "Limpeza",
                      "Obras",
                      "Administrativo",
                      "Outros",
                    ].includes(formData.categoria)
                      ? formData.categoria
                      : "Outra"
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Outra") {
                      setFormData({ ...formData, categoria: "" });
                      setShowCustomCategory(true);
                    } else {
                      setFormData({ ...formData, categoria: val });
                      setShowCustomCategory(false);
                    }
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="Mensalidade">Mensalidade</option>
                  <option value="Doação">Doação</option>
                  <option value="Evento">Evento</option>
                  <option value="Energia">Energia</option>
                  <option value="Água">Água</option>
                  <option value="Comunicação">Comunicação</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Obras">Obras</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Outros">Outros</option>
                  <option value="Outra">Nova Categoria...</option>
                </select>
                {showCustomCategory && (
                  <Input
                    placeholder="Digite a nova categoria"
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategoria">Subcategoria</Label>
                <Input
                  id="subcategoria"
                  placeholder="Ex: Lanche, Jantar"
                  value={formData.subcategoria}
                  onChange={(e) =>
                    setFormData({ ...formData, subcategoria: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Input
                id="observacao"
                placeholder="Detalhes adicionais (opcional)"
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                required
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  required
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data do Movimento</Label>
                <Input
                  id="data"
                  type="date"
                  required
                  value={formData.data_movimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_movimento: e.target.value })
                  }
                />
              </div>
            </div>

            {/* --- Status & Comprovante --- */}
            <div className="p-4 border rounded-md bg-muted/20 space-y-4">
              <h3 className="font-medium text-sm">Status e Comprovante</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="comprovante">Anexar Comprovante</Label>
                  <Input
                    id="comprovante"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obrigatório para status REGISTRADO (Despesas).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.status}
                    disabled={formData.tipo === "DESPESA" && !file} // Can't start as REGISTRADO without file if is despesa
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "RASCUNHO" | "REGISTRADO",
                      })
                    }
                  >
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="REGISTRADO">Registrado</option>
                  </select>
                  {formData.tipo === "DESPESA" && !file && (
                    <p className="text-xs text-yellow-600">
                      Anexe comprovante para registrar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Salvando..."
                : formData.status === "REGISTRADO"
                  ? "Registrar Lançamento"
                  : "Salvar Rascunho"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
