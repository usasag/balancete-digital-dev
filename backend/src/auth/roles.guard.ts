import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLE_HIERARCHY } from '../common/enums/role.enum';
import { Usuario } from '../usuario/usuario.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true; // Endpoint sem restrição de role
    }

    const request = context.switchToHttp().getRequest<{ user: Usuario }>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Usuário sem role definida.');
    }

    // RBAC Hierárquico Check
    // A role do usuário deve ter nível >= a role requerida?
    // OU a role deve estar na lista de permitidos?
    // O prompt diz: "implementar estritamente 7 níveis de acesso. A autorização deve ser 'cascata'"

    // Se a lista define roles exatas permitidas, checamos inclusão.
    // Se quisermos hierarquia dinâmica, precisamos saber o "nível mínimo".
    // Geralmente @Roles() define quem pode acessar.

    // Vamos assumir que requiredRoles lista as roles EXPLICITAMENTE permitidas, mas podemos otimizar.
    // Se o decorador @Roles('TESOURARIA') for usado, significa que 'TESOURARIA' e ACIMA podem?
    // Vamos implementar a lógica de "Nível Mínimo" se houver apenas 1 role, ou "OneOf" se array.

    // Simplificação: Se o usuário tem uma role que está na lista requiredRoles, OK.
    // MAS, para suportar "Cascata", o controller deve listar todas ou a gente faz a lógica aqui.
    // Vamos fazer a lógica de hierarquia aqui.

    // Pegamos o "Nível Mínimo" exigido. Assumimos que a role passada no Decorator é o nível mínimo.
    // Se passar varias, pegamos a menor? Não, geralmente lista quem pode.
    // Vamos fazer check de inclusão simples E hierarquia se aplicável.

    // Implementação Robusta: Checar se o user.role tem hierarchy value >= hierarchy value de ALGUEMA das requiredRoles.
    // Ex: Se required é 'TESOURARIA', e user é 'PRESIDENCIA'.
    // Hierarchy(PRESIDENCIA) = 9, Hierarchy(TESOURARIA) = 7. 9 >= 7 -> OK.

    const userRoleValue = ROLE_HIERARCHY[user.role];

    const hasPermission = requiredRoles.some((requiredRole) => {
      const requiredRoleValue = ROLE_HIERARCHY[requiredRole];
      return userRoleValue >= requiredRoleValue;
    });

    return hasPermission;
  }
}
