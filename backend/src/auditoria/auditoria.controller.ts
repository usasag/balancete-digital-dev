import {
  Controller,
  Get,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditoriaService } from './auditoria.service';
import { Usuario } from '../usuario/usuario.entity';
import { PermissionsService } from '../auth/permissions.service';
import { PermissionAction } from '../auth/permission-action.enum';

@Controller('auditoria')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get('logs')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async list(@Request() req: { user: Usuario }) {
    this.permissionsService.ensure(req.user, PermissionAction.AUDITORIA_VIEW);
    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }
    return this.auditoriaService.findByNucleo(nucleoId);
  }
}
