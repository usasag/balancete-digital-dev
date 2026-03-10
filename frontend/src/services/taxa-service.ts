import api from "./api";

export interface Taxa {
  id: string;
  nucleoId: string;
  nome: string;
  descricao?: string;
  valor: number;
  parcelado: boolean;
  total_parcelas: number;
  ativa: boolean;
  opcional: boolean;
  variavel: boolean;
  caixaId?: string;
}

export interface ConfiguracaoFinanceira {
  id: string;
  nucleoId: string;
  valor_repasse_dg: number;
  valor_repasse_regiao: number;
  caixaDgId?: string;
  caixaRegiaoId?: string;
  caixaNucleoId?: string;
}

export interface CreateTaxaDto {
  nome: string;
  descricao?: string;
  valor: number;
  parcelado: boolean;
  total_parcelas: number;
  ativa: boolean;
  opcional: boolean;
  variavel: boolean;
  caixaId?: string;
}

export const taxaService = {
  findAll: async () => {
    const response = await api.get<Taxa[]>("/taxas");
    return response.data;
  },

  create: async (data: CreateTaxaDto) => {
    const response = await api.post<Taxa>("/taxas", data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateTaxaDto>) => {
    const response = await api.put<Taxa>(`/taxas/${id}`, data);
    return response.data;
  },

  remove: async (id: string) => {
    await api.delete(`/taxas/${id}`);
  },
};

export const configuracaoService = {
  get: async () => {
    const response = await api.get<ConfiguracaoFinanceira>("/configuracao");
    return response.data;
  },

  update: async (data: Partial<ConfiguracaoFinanceira>) => {
    const response = await api.put<ConfiguracaoFinanceira>("/configuracao", data);
    return response.data;
  },
};
