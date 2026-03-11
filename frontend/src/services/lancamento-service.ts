import api from "./api";

export interface Lancamento {
  id: string;
  tipo: "RECEITA" | "DESPESA";
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria?: string;
  observacao?: string;
  data_movimento: string;
  nucleoId: string;
  criadoPorId: string;
  caixaId?: string;
  caixa?: {
    id: string;
    nome: string;
  };
  status?: "RASCUNHO" | "REGISTRADO";
  comprovante_url?: string;
  evidenciaDriveFileId?: string;
  evidenciaDriveFolderId?: string;
  evidenciaWebViewLink?: string;
}

export interface CreateLancamentoDto {
  tipo: "RECEITA" | "DESPESA";
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria?: string;
  observacao?: string;
  data_movimento: string;
  nucleoId: string;
  criadoPorId: string;
  status?: "RASCUNHO" | "REGISTRADO";
  caixaId?: string;
}

export interface ImportPreviewError {
  linha: number;
  mensagem: string;
}

export interface ImportPreviewRow {
  linha: number;
  tipo: "RECEITA" | "DESPESA";
  descricao: string;
  valor: number;
  categoria: string;
  data_movimento: string;
  status?: "RASCUNHO" | "REGISTRADO";
}

export interface ImportPreviewResult {
  validRows: ImportPreviewRow[];
  errors: ImportPreviewError[];
}

export interface ImportExecuteResult {
  created: number;
  errors: ImportPreviewError[];
}

export interface LancamentoImportLog {
  id: string;
  arquivoNome: string;
  totalLinhas: number;
  linhasValidas: number;
  linhasCriadas: number;
  linhasComErro: number;
  erros: ImportPreviewError[] | null;
  dataCriacao: string;
  usuario?: {
    id: string;
    nomeCompleto?: string;
    email?: string;
  };
}

export interface LancamentoTemplate {
  id: string;
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  categoria: string;
  subcategoria?: string | null;
  descricao: string;
  observacao?: string | null;
  valor: number;
  caixaId?: string | null;
}

export const lancamentoService = {
  /**
   * Create a new lancamento with optional file attachment
   */
  create: async (data: CreateLancamentoDto, file?: File) => {
    const formData = new FormData();

    // Append all fields to FormData
    formData.append("tipo", data.tipo);
    formData.append("descricao", data.descricao);
    formData.append("valor", String(data.valor));
    formData.append("categoria", data.categoria);
    formData.append("data_movimento", data.data_movimento);
    formData.append("nucleoId", data.nucleoId);
    formData.append("criadoPorId", data.criadoPorId);

    if (data.subcategoria) formData.append("subcategoria", data.subcategoria);
    if (data.observacao) formData.append("observacao", data.observacao);
    if (data.status) formData.append("status", data.status);
    if (data.caixaId) formData.append("caixaId", data.caixaId);

    // Append file if provided
    if (file) {
      formData.append("file", file);
    }

    const response = await api.post<Lancamento>("/lancamentos", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  findAllByNucleo: async (nucleoId: string) => {
    const response = await api.get<Lancamento[]>(
      `/lancamentos/nucleo/${nucleoId}`,
    );
    return response.data;
  },

  remove: async (id: string) => {
    await api.delete(`/lancamentos/${id}`);
  },

  importPreview: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ImportPreviewResult>(
      "/lancamentos/import/preview",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  importExecute: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<ImportExecuteResult>(
      "/lancamentos/import/execute",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  vincularEvidenciaReceitas: async (payload: {
    caixaId: string;
    dataInicio: string;
    dataFim: string;
    comprovante_url: string;
  }) => {
    const response = await api.post<{ updated: number; message: string }>(
      "/lancamentos/receitas/evidencia-compartilhada",
      payload,
    );
    return response.data;
  },

  getImportLogs: async () => {
    const response = await api.get<LancamentoImportLog[]>(
      "/lancamentos/import/logs",
    );
    return response.data;
  },

  getTemplatesByNucleo: async (nucleoId: string) => {
    const response = await api.get<LancamentoTemplate[]>(
      `/lancamentos/templates/nucleo/${nucleoId}`,
    );
    return response.data;
  },

  getDriveEvidenceStatus: async () => {
    const response = await api.get<{
      provider: "LOCAL_TEST" | "GOOGLE_DRIVE_PENDING";
      driveConfigured: boolean;
    }>("/lancamentos/evidencia/drive-status");
    return response.data;
  },

  createTemplate: async (payload: {
    nome: string;
    tipo: "RECEITA" | "DESPESA";
    categoria: string;
    subcategoria?: string;
    descricao: string;
    observacao?: string;
    valor: number;
    caixaId?: string;
  }) => {
    const response = await api.post<LancamentoTemplate>(
      "/lancamentos/templates",
      payload,
    );
    return response.data;
  },

  duplicatePreviousMonth: async (payload: {
    referenceYear: number;
    referenceMonth: number;
    targetYear: number;
    targetMonth: number;
  }) => {
    const response = await api.post<{
      sourceCount: number;
      created: number;
      errors: Array<{ sourceId: string; mensagem: string }>;
    }>("/lancamentos/duplicate-previous-month", payload);
    return response.data;
  },

  /**
   * Update a lancamento with optional new file attachment
   */
  update: async (
    id: string,
    data: Partial<CreateLancamentoDto>,
    file?: File,
  ) => {
    const formData = new FormData();

    // Append all provided fields to FormData
    if (data.tipo) formData.append("tipo", data.tipo);
    if (data.descricao) formData.append("descricao", data.descricao);
    if (data.valor !== undefined) formData.append("valor", String(data.valor));
    if (data.categoria) formData.append("categoria", data.categoria);
    if (data.data_movimento)
      formData.append("data_movimento", data.data_movimento);
    if (data.nucleoId) formData.append("nucleoId", data.nucleoId);
    if (data.criadoPorId) formData.append("criadoPorId", data.criadoPorId);
    if (data.subcategoria) formData.append("subcategoria", data.subcategoria);
    if (data.observacao) formData.append("observacao", data.observacao);
    if (data.status) formData.append("status", data.status);
    if (data.caixaId) formData.append("caixaId", data.caixaId);

    // Append file if provided
    if (file) {
      formData.append("file", file);
    }

    const response = await api.put<Lancamento>(`/lancamentos/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
