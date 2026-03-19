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

export interface PreFechamentoChecklist {
  lancamentosRascunho: number;
  mensalidadesPendentes: number;
  totalPendenciasCriticas: number;
  bloqueiaFechamento: boolean;
}

export interface DashboardAlert {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
}

export interface DashboardAlertResponse {
  generatedAt: string;
  total: number;
  alertas: DashboardAlert[];
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

  getChecklist: async (
    mes: number,
    ano: number,
    nucleoId: string,
  ): Promise<PreFechamentoChecklist> => {
    const response = await api.get(
      `/periodos/checklist?mes=${mes}&ano=${ano}&nucleoId=${nucleoId}`,
    );
    return response.data;
  },

  getAlertas: async (nucleoId: string): Promise<DashboardAlertResponse> => {
    const response = await api.get<DashboardAlertResponse>(
      `/periodos/alertas/${nucleoId}`,
    );
    return response.data;
  },
};
