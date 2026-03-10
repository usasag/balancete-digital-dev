import api from "./api";

export interface CategoriaFinanceira {
  id: string;
  nucleoId: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  subcategorias: string[];
  ativa: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
}

export const categoriaFinanceiraService = {
  findAllByNucleo: async (nucleoId: string): Promise<CategoriaFinanceira[]> => {
    const response = await api.get(`/categorias-financeiras/nucleo/${nucleoId}`);
    return response.data;
  },

  create: async (data: Partial<CategoriaFinanceira>): Promise<CategoriaFinanceira> => {
    const response = await api.post('/categorias-financeiras', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CategoriaFinanceira>): Promise<CategoriaFinanceira> => {
    const response = await api.patch(`/categorias-financeiras/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/categorias-financeiras/${id}`);
  },
};
