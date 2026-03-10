"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  CategoriaFinanceira,
  categoriaFinanceiraService,
} from "@/services/categoria-financeira-service";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function PlanoContasPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("RECEITA");
  const [subcategoriasInput, setSubcategoriasInput] = useState("");
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  
  const loadCategorias = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.nucleoId) return;
      const data = await categoriaFinanceiraService.findAllByNucleo(
        user.nucleoId,
      );
      setCategorias(data);
    } catch (error) {
      console.error(error);
      toast("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.nucleoId) {
      loadCategorias();
    }
  }, [user, loadCategorias]);

  const handleOpenDialog = (categoria?: CategoriaFinanceira) => {
    if (categoria) {
      setEditingId(categoria.id);
      setNome(categoria.nome);
      setTipo(categoria.tipo);
      setSubcategorias(categoria.subcategorias || []);
      setSubcategoriasInput("");
    } else {
      setEditingId(null);
      setNome("");
      setTipo("RECEITA");
      setSubcategorias([]);
      setSubcategoriasInput("");
    }
    setIsDialogOpen(true);
  };

  const handleAddSubcategoria = () => {
    if (subcategoriasInput.trim()) {
      setSubcategorias([...subcategorias, subcategoriasInput.trim()]);
      setSubcategoriasInput("");
    }
  };

  const handleRemoveSubcategoria = (index: number) => {
    const newSubs = [...subcategorias];
    newSubs.splice(index, 1);
    setSubcategorias(newSubs);
  };

  const handleSave = async () => {
    try {
      if (!user?.nucleoId) return;

      const payload = {
        nucleoId: user.nucleoId,
        nome,
        tipo,
        subcategorias,
        ativa: true,
      };

      if (editingId) {
        await categoriaFinanceiraService.update(editingId, payload);
        toast("Categoria atualizada com sucesso!");
      } else {
        await categoriaFinanceiraService.create(payload);
        toast("Categoria criada com sucesso!");
      }

      setIsDialogOpen(false);
      loadCategorias();
    } catch (error) {
      console.error(error);
      toast("Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      await categoriaFinanceiraService.remove(id);
      toast("Categoria excluída");
      loadCategorias();
    } catch (error) {
      console.error(error);
      toast("Erro ao excluir");
    }
  };

  if (loading) return <LoadingSpinner />;

  const receitas = categorias.filter((c) => c.tipo === "RECEITA");
  const despesas = categorias.filter((c) => c.tipo === "DESPESA");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plano de Contas</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias de receitas e despesas.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Receitas</CardTitle>
            <CardDescription>Categorias de entrada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {receitas.map((cat) => (
              <div
                key={cat.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-lg">{cat.nome}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cat.subcategorias?.map((sub, i) => (
                      <Badge key={i} variant="secondary">
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(cat)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {receitas.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhuma categoria cadastrada.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Despesas</CardTitle>
            <CardDescription>Categorias de saída.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {despesas.map((cat) => (
              <div
                key={cat.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-lg">{cat.nome}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cat.subcategorias?.map((sub, i) => (
                      <Badge key={i} variant="secondary">
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(cat)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {despesas.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhuma categoria cadastrada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Doações, Manutenção..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as "RECEITA" | "DESPESA")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategorias</Label>
              <div className="flex space-x-2">
                <Input
                  value={subcategoriasInput}
                  onChange={(e) => setSubcategoriasInput(e.target.value)}
                  placeholder="Nova subcategoria..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubcategoria();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddSubcategoria}
                  variant="secondary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {subcategorias.map((sub, index) => (
                  <Badge key={index} variant="outline" className="pr-1">
                    {sub}
                    <button
                      onClick={() => handleRemoveSubcategoria(index)}
                      className="ml-2 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
