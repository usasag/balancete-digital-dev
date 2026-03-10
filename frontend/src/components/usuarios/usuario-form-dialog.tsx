"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UsuarioService } from "@/services/usuario-service";
import { toast } from "sonner";
import { Usuario } from "@/types/usuario";

interface UsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
  onSuccess: () => void;
}

export function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
  onSuccess,
}: UsuarioFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [valorBase, setValorBase] = useState<number>(0);

  useEffect(() => {
    if (usuario) {
      setValorBase(usuario.valor_base || 0);
    }
  }, [usuario]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    setLoading(true);
    try {
      await UsuarioService.update(usuario.id, {
        valor_base: valorBase,
      });
      toast.success("Usuário atualizado com sucesso.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Falha ao atualizar usuário.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário: {usuario?.nomeCompleto}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor_base">Valor Base da Mensalidade (R$)</Label>
            <Input
              id="valor_base"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={valorBase}
              onChange={(e) => setValorBase(Number(e.target.value))}
            />
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
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
