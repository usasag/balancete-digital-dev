import api from "./api";

export interface MensalidadeItem {
  nome: string;
  valor: number;
  obrigatorio: boolean;
  selecionado: boolean;
}

export interface TaxaExtra {
  descricao: string;
  valor_total: number;
  parcela_atual: number;
  total_parcelas: number;
  valor_parcela: number;
}

// Status types based on new business rules
export type MensalidadeStatus =
  | "PENDENTE"
  | "PAGO"
  | "ATRASADO"
  | "INADIMPLENTE"
  | "EM ACORDO"
  | "SUJEITO A PENA SOCIAL"
  | "PENA SOCIAL";

export interface Mensalidade {
  id: string;
  socioId: string;
  socio: { nomeCompleto: string };
  nucleoId: string;
  valor: number; // Final value (valor_total)
  valor_base: number;
  valor_total: number;
  data_vencimento?: string;
  itens?: MensalidadeItem[];
  taxa_extra?: TaxaExtra[];
  mes_referencia: string;
  status: "PENDENTE" | "PAGO" | "ATRASADO" | "INADIMPLENTE" | "EM ACORDO";
  data_pagamento?: string;
  data_acordo?: string;
  criadoPorId?: string;
}

export interface CreateMensalidadeDto {
  socioId: string;
  nucleoId: string;
  valor_base: number;
  mes_referencia: string;
  status: "PENDENTE" | "PAGO";
  data_vencimento?: string;
  itens?: MensalidadeItem[];
  taxa_extra?: TaxaExtra[];
  data_pagamento?: string;
  caixaId?: string;
}

export const mensalidadeService = {
  create: async (data: CreateMensalidadeDto) => {
    const response = await api.post<Mensalidade>("/mensalidades", data);
    return response.data;
  },

  findAllByNucleo: async (nucleoId: string) => {
    const response = await api.get<Mensalidade[]>(
      `/mensalidades/nucleo/${nucleoId}`,
    );
    return response.data;
  },

  update: async (id: string, data: Partial<Mensalidade>) => {
    const response = await api.put<Mensalidade>(`/mensalidades/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/mensalidades/${id}`);
  },

  pay: async (id: string, date?: Date): Promise<Mensalidade> => {
    const response = await api.post<Mensalidade>(
      `/mensalidades/${id}/pay`,
      date ? { date: date.toISOString() } : {},
    );
    return response.data;
  },

  registerAgreement: async (id: string, date: Date): Promise<Mensalidade> => {
    const response = await api.post<Mensalidade>(
      `/mensalidades/${id}/agreement`,
      { date: date.toISOString() },
    );
    return response.data;
  },

  getInadimplenciaReport: async (nucleoId: string) => {
    const response = await api.get<InadimplenciaReportItem[]>(
      `/mensalidades/inadimplencia/${nucleoId}`,
    );
    return response.data;
  },
};

export interface InadimplenciaReportItem {
  socio: {
    id: string;
    nomeCompleto: string;
    email: string;
    telefone?: string;
  };
  total_devido: number;
  meses_atraso: number;
  mensalidades: Array<{
    id: string;
    mes_referencia: string;
    valor: number;
    vencimento: string;
    status: string;
  }>;
}
