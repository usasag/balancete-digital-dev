
import { Role } from "./role";
import { Grau } from "./grau";

export interface Usuario {
  id: string;
  email: string;
  nomeCompleto: string;
  role: Role;
  grau?: Grau;
  firebaseUid?: string;
  nucleoId: string;
  ativo: boolean;
  cargo?: string;
  valor_base?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateUsuarioDTO = Omit<Usuario, "id" | "createdAt" | "updatedAt">;
export type UpdateUsuarioDTO = Partial<CreateUsuarioDTO>;
