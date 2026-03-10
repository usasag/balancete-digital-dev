
import api from "./api";
import { Usuario, UpdateUsuarioDTO } from "@/types/usuario";
import { Mensalidade } from "./mensalidade-service";

export const UsuarioService = {
  getAll: async () => {
    // Determine path based on if we filtre by nucleo or get all (admin)
    // For now assuming we get for current nucleo or all if global admin
    // Endpoint: /usuarios or /usuarios/nucleo/:id
    const response = await api.get<Usuario[]>("/usuarios");
    return response.data;
  },

  getByNucleo: async (nucleoId: string) => {
    const response = await api.get<Usuario[]>(`/usuarios/nucleo/${nucleoId}`);
    return response.data;
  },

  update: async (id: string, data: UpdateUsuarioDTO) => {
    const response = await api.patch<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  getInadimplenciaReport: async (nucleoId: string) => {
    const response = await api.get<Mensalidade[]>(`/mensalidades/inadimplencia/${nucleoId}`);
    return response.data;
  },
};
