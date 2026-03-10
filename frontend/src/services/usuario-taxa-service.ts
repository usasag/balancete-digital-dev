import api from './api';

export interface AssignTaxaDto {
  usuarioIds: string[];
  taxaId: string;
  valorTotal: number;
  numParcelas: number;
  dataInicio: string; // YYYY-MM-DD
}

export interface PreviewParcela {
  numero: number;
  valor: number;
  vencimento: string;
}

export const usuarioTaxaService = {
  assign: async (data: AssignTaxaDto) => {
    const response = await api.post('/usuario-taxas/assign', data);
    return response.data;
  },

  preview: async (data: AssignTaxaDto): Promise<PreviewParcela[]> => {
    const response = await api.post<PreviewParcela[]>('/usuario-taxas/preview', data);
    return response.data;
  },
};
