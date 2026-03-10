import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  lancamentoService,
  Lancamento,
  CreateLancamentoDto,
} from "@/services/lancamento-service";
import { caixaService, Caixa } from "@/services/caixa-service";
import {
  categoriaFinanceiraService,
  CategoriaFinanceira,
} from "@/services/categoria-financeira-service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LancamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamentoToEdit?: Lancamento | null;
  onSuccess: () => void;
  nucleoId: string;
}

export function LancamentoFormDialog({
  open,
  onOpenChange,
  lancamentoToEdit,
  onSuccess,
  nucleoId,
}: LancamentoFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
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

  // Fetch caixas and categories on mount/open
  useEffect(() => {
    if (open && nucleoId) {
      caixaService
        .findAllByNucleo(nucleoId)
        .then((data) => {
          setCaixas(data);
          // Auto-select Tesouraria as default
          if (!lancamentoToEdit) {
            const tesouraria = data.find((c) =>
              c.nome.toLowerCase().includes("tesouraria"),
            );
            if (tesouraria) {
              setFormData((prev) => ({ ...prev, caixaId: tesouraria.id }));
            }
          }
        })
        .catch(console.error);

      categoriaFinanceiraService
        .findAllByNucleo(nucleoId)
        .then(setCategorias)
        .catch(console.error);
    }
  }, [open, nucleoId, lancamentoToEdit]);

  // Populate form on edit
  useEffect(() => {
    if (lancamentoToEdit) {
      setFormData({
        descricao: lancamentoToEdit.descricao,
        valor: String(lancamentoToEdit.valor),
        categoria: lancamentoToEdit.categoria,
        subcategoria: lancamentoToEdit.subcategoria || "",
        observacao: lancamentoToEdit.observacao || "",
        data_movimento: lancamentoToEdit.data_movimento.split("T")[0],
        tipo: lancamentoToEdit.tipo,
        caixaId: lancamentoToEdit.caixaId || "",
        status: lancamentoToEdit.status || "RASCUNHO",
      });
      setFile(null); // Reset file on new edit
    } else {
      // Reset for new
      setFormData({
        descricao: "",
        valor: "",
        categoria: "",
        subcategoria: "",
        observacao: "",
        data_movimento: new Date().toISOString().split("T")[0],
        tipo: "DESPESA",
        caixaId: "",
        status: "RASCUNHO",
      });
      setFile(null);
    }
  }, [lancamentoToEdit, open]);

  // Validation logic regarding status and file
  useEffect(() => {
    if (formData.tipo === "DESPESA") {
      if (!lancamentoToEdit && !file && formData.status === "REGISTRADO") {
        setFormData((prev) => ({ ...prev, status: "RASCUNHO" }));
      }
    }
  }, [file, formData.tipo, formData.status, lancamentoToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFormData((prev) => ({ ...prev, status: "REGISTRADO" }));
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.backendId) return;

    setLoading(true);
    try {
      const payload: CreateLancamentoDto = {
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        categoria: formData.categoria,
        subcategoria: formData.subcategoria || undefined,
        observacao: formData.observacao || undefined,
        data_movimento: formData.data_movimento,
        nucleoId: nucleoId,
        criadoPorId: user.backendId,
        caixaId: formData.caixaId || undefined,
        status: formData.status,
      };

      if (lancamentoToEdit) {
        await lancamentoService.update(
          lancamentoToEdit.id,
          payload,
          file || undefined,
        );
        toast.success("Lançamento atualizado!");
      } else {
        await lancamentoService.create(payload, file || undefined);
        toast.success("Lançamento criado!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar lançamento.");
    } finally {
      setLoading(false);
    }
  };

  // Filter categories by selected type
  const availableCategorias = categorias.filter(
    (c) => c.tipo === formData.tipo && c.ativa,
  );

  // Get Subcategories for selected category
  const selectedCategoriaObj = categorias.find(
    (c) => c.nome === formData.categoria,
  );
  const availableSubcategorias = selectedCategoriaObj?.subcategorias || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lancamentoToEdit ? "Editar Lançamento" : "Novo Lançamento"}
          </DialogTitle>
        </DialogHeader>
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
                onChange={(e) => {
                  const newTipo = e.target.value as "RECEITA" | "DESPESA";
                  // Clear category if switching type, as categories are type-specific
                  setFormData({
                    ...formData,
                    tipo: newTipo,
                    categoria: "",
                    subcategoria: "",
                  });
                }}
              >
                <option value="DESPESA">Despesa</option>
                <option value="RECEITA">Receita</option>
              </select>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.categoria}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    categoria: e.target.value,
                    subcategoria: "",
                  });
                }}
                required
                disabled={availableCategorias.length === 0}
              >
                {availableCategorias.length === 0 ? (
                  <option value="">Não existem categorias</option>
                ) : (
                  <>
                    <option value="">Selecione...</option>
                    {availableCategorias.map((cat) => (
                      <option key={cat.id} value={cat.nome}>
                        {cat.nome}
                      </option>
                    ))}
                    {/* Fallback if editing and category doesn't strictly exist in active list anymore, though rare */}
                    {formData.categoria &&
                      !availableCategorias.find(
                        (c) => c.nome === formData.categoria,
                      ) && (
                        <option value={formData.categoria}>
                          {formData.categoria}
                        </option>
                      )}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategoria">Subcategoria</Label>
              {/* Use Datalist or Select if subcategories are available */}
              {availableSubcategorias.length > 0 ? (
                <select
                  id="subcategoria"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.subcategoria}
                  onChange={(e) =>
                    setFormData({ ...formData, subcategoria: e.target.value })
                  }
                >
                  <option value="">Selecione (Opcional)</option>
                  {availableSubcategorias.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="subcategoria"
                  placeholder="Ex: Lanche, Jantar"
                  value={formData.subcategoria}
                  onChange={(e) =>
                    setFormData({ ...formData, subcategoria: e.target.value })
                  }
                />
              )}
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

          <div className="p-4 border rounded-md bg-muted/20 space-y-4">
            <h3 className="font-medium text-sm">Status e Comprovante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comprovante">
                  {lancamentoToEdit
                    ? "Substituir Comprovante"
                    : "Anexar Comprovante"}
                </Label>
                <Input
                  id="comprovante"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.tipo === "DESPESA"
                    ? "Obrigatório para status REGISTRADO."
                    : "Opcional."}
                </p>
                {lancamentoToEdit?.comprovante_url && !file && (
                  <p className="text-xs text-green-600 font-medium">
                    Comprovante já anexado.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.status}
                  disabled={
                    formData.tipo === "DESPESA" &&
                    !file &&
                    !lancamentoToEdit?.comprovante_url &&
                    formData.status === "RASCUNHO"
                  }
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
                {formData.tipo === "DESPESA" &&
                  !file &&
                  !lancamentoToEdit?.comprovante_url && (
                    <p className="text-xs text-yellow-600">
                      Anexe comprovante para registrar.
                    </p>
                  )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
