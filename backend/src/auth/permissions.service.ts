import { Injectable, ForbiddenException } from '@nestjs/common';
import { Usuario } from '../usuario/usuario.entity';
import { PermissionAction, ROLE_PERMISSIONS } from './permission-action.enum';

@Injectable()
export class PermissionsService {
  ensure(user: Usuario, action: PermissionAction): void {
    const allowed = ROLE_PERMISSIONS[user.role] || [];
    if (!allowed.includes(action)) {
      throw new ForbiddenException(
        `Ação não permitida para o perfil atual: ${action}`,
      );
    }
  }
}
