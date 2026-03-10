import { Request } from 'express';
import { Usuario } from '../usuario/usuario.entity';

export type RequestWithUser = Request & { user: Usuario };
