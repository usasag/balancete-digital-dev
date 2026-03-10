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
