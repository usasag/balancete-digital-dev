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
import {
  ContaBancaria,
  contaBancariaService,
} from "@/services/conta-bancaria-service";

interface ContaBancariaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaToEdit?: ContaBancaria | null;
  onSuccess: () => void;
  nucleoId: string;
}

export function ContaBancariaFormDialog({
  open,
  onOpenChange,
  contaToEdit,
  onSuccess,
  nucleoId,
}: ContaBancariaFormDialogProps) {
  const [formData, setFormData] = useState({
    nome_conta: "",
    banco: "",
    agencia: "",
    numero_conta: "",
    cnpj_instituicao: "",
    chave_pix: "",
    ativa: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contaToEdit) {
      setFormData({
        nome_conta: contaToEdit.nome_conta,
        banco: contaToEdit.banco,
        agencia: contaToEdit.agencia,
        numero_conta: contaToEdit.numero_conta,
        cnpj_instituicao: contaToEdit.cnpj_instituicao || "",
        chave_pix: contaToEdit.chave_pix || "",
        ativa: contaToEdit.ativa,
      });
    } else {
      setFormData({
        nome_conta: "",
        banco: "",
        agencia: "",
        numero_conta: "",
        cnpj_instituicao: "",
        chave_pix: "",
        ativa: true,
      });
    }
  }, [contaToEdit, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        nucleoId,
        saldo_disponivel: contaToEdit ? contaToEdit.saldo_disponivel : 0, // Preserve balance or init 0
      };

      if (contaToEdit) {
        await contaBancariaService.update(contaToEdit.id, payload);
        toast.success("Conta atualizada com sucesso!");
      } else {
        await contaBancariaService.create(payload);
        toast.success("Conta criada com sucesso!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar conta bancária.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {contaToEdit ? "Editar Conta Bancária" : "Nova Conta Bancária"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_conta">Nome da Conta (Apelido)</Label>
            <Input
              id="nome_conta"
              value={formData.nome_conta}
              onChange={handleChange}
              placeholder="Ex: Conta Principal - BB"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Input
                id="banco"
                value={formData.banco}
                onChange={handleChange}
                placeholder="Ex: Banco do Brasil"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input
                id="agencia"
                value={formData.agencia}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero_conta">Número da Conta</Label>
            <Input
              id="numero_conta"
              value={formData.numero_conta}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj_instituicao">
              CNPJ da Instituição (Opcional)
            </Label>
            <Input
              id="cnpj_instituicao"
              value={formData.cnpj_instituicao}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chave_pix">Chave PIX</Label>
            <Input
              id="chave_pix"
              value={formData.chave_pix}
              onChange={handleChange}
              placeholder="CPF, CNPJ, Email ou Aleatória"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativa"
              checked={formData.ativa}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, ativa: checked === true }))
              }
            />
            <Label htmlFor="ativa">Ativa</Label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
