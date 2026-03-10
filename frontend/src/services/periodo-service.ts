import api from "./api";

export enum PeriodoStatus {
  ABERTO = 'ABERTO',
  FECHADO = 'FECHADO',
}

export interface ReaberturaLog {
  data: string;
  usuarioId: string;
  justificativa: string;
}

export interface Periodo {
  id: string;
  mes: number;
  ano: number;
  status: PeriodoStatus;
  reaberturas: ReaberturaLog[];
  data_fechamento?: string;
  nucleoId: string;
  criadoEm: string;
  atualizadoEm: string;
  pendencias?: number;
}

export const periodoService = {
  findAllByNucleo: async (nucleoId: string): Promise<Periodo[]> => {
    const response = await api.get(`/periodos/nucleo/${nucleoId}`);
    return response.data;
  },

  abrir: async (mes: number, ano: number, nucleoId: string): Promise<Periodo> => {
    const response = await api.post("/periodos/abrir", { mes, ano, nucleoId });
    return response.data;
  },

  fechar: async (mes: number, ano: number, nucleoId: string): Promise<Periodo> => {
    const response = await api.post("/periodos/fechar", { mes, ano, nucleoId });
    return response.data;
  },

  reabrir: async (id: string, justificativa: string): Promise<Periodo> => {
    const response = await api.post(`/periodos/reabrir/${id}`, { justificativa });
    return response.data;
  },
};
