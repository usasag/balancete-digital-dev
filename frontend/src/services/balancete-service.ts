import api from './api';

export enum BalanceteStatus {
  RASCUNHO = 'RASCUNHO',
  EM_APROVACAO = 'EM_APROVACAO',
  APROVADO = 'APROVADO',
  REPROVADO = 'REPROVADO',
  PUBLICADO = 'PUBLICADO',
}

export interface Usuario {
    id: string;
    nomeCompleto: string;
    email: string;
}

export interface BalanceteAprovacao {
    id: string;
    usuario: Usuario;
    role_aprovador: string;
    status: 'APROVADO' | 'REPROVADO' | 'PENDENTE';
    ressalva?: string;
}

export interface Lancamento {
  id: string;
  data_movimento: string;
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria?: string;
  observacao?: string;
  nucleoId: string;
  anexo_url?: string;
  caixa?: {
    id: string;
    nome: string;
    };
}

export interface Balancete {
  id: string;
  ano_mes: string;
  status: BalanceteStatus;
  nucleoId: string;
  criadoEm: string;
  atualizadoEm: string;
  saldo_inicial?: number;
  saldo_final?: number;
  total_receitas?: number;
  total_despesas?: number;
  aprovacoes?: BalanceteAprovacao[];
  lancamentos?: Lancamento[];
}

export const balanceteService = {
  findAll: async () => {
    const response = await api.get<Balancete[]>(`/balancetes`);
    return response.data;
  },

  create: async (data: { ano_mes: string }) => {
    const response = await api.post<Balancete>('/balancetes', data);
    return response.data;
  },

  approve: async (id: string, status: 'APROVADO' | 'REPROVADO', ressalva?: string) => {
    const response = await api.put<Balancete>(`/balancetes/${id}/aprovar`, {
      status,
      ressalva,
    });
    return response.data;
  },

  findOne: async (id: string) => {
      const response = await api.get<Balancete>(`/balancetes/${id}`);
      return response.data;
  }
};
