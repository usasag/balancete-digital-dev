import api from "./api";

export interface ContaBancaria {
  id: string;
  nome_conta: string;
  banco: string;
  agencia: string;
  numero_conta: string;
  cnpj_instituicao?: string;
  chave_pix?: string;
  saldo_disponivel: number;
  nucleoId: string;
  ativa: boolean;
}

export type CreateContaBancariaDto = Omit<ContaBancaria, "id">;

export const contaBancariaService = {
  findAllByNucleo: async (nucleoId: string): Promise<ContaBancaria[]> => {
    const response = await api.get(`/contas-bancarias/nucleo/${nucleoId}`);
    return response.data;
  },

  create: async (data: CreateContaBancariaDto): Promise<ContaBancaria> => {
    const response = await api.post("/contas-bancarias", data);
    return response.data;
  },

  update: async (id: string, data: Partial<ContaBancaria>): Promise<ContaBancaria> => {
    const response = await api.patch(`/contas-bancarias/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/contas-bancarias/${id}`);
  },
};
