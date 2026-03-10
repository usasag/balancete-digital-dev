import api from './api';

export interface Caixa {
  id: string;
  nome: string;
  nucleoId: string;
  saldoInicial: number;
  ativo: boolean;
  distribuicaoInicial?: {
    dinheiro: number;
    contas: Record<string, number>;
    outros: number;
  };
}

export const caixaService = {
  findAllByNucleo: async (nucleoId: string): Promise<Caixa[]> => {
    const response = await api.get<Caixa[]>(`/caixas/nucleo/${nucleoId}`);
    return response.data;
  },

  create: async (data: Partial<Caixa>) => {
    const response = await api.post<Caixa>("/caixas", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Caixa>) => {
    const response = await api.patch<Caixa>(`/caixas/${id}`, data);
    return response.data;
  },

  remove: async (id: string) => {
    await api.delete(`/caixas/${id}`);
  },
};
