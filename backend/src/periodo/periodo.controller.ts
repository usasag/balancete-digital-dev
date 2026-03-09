import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PeriodoService } from './periodo.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('periodos')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class PeriodoController {
  constructor(private service: PeriodoService) {}

  @Get('nucleo/:nucleoId')
  @Roles(
    Role.ADMIN_GLOBAL,
    Role.PRESIDENCIA,
    Role.TESOURARIA,
    Role.CONTABILIDADE_UNICA,
    Role.CONSELHO_FISCAL,
  )
  async findAll(@Param('nucleoId') nucleoId: string) {
    return this.service.findByNucleo(nucleoId);
  }

  @Post('abrir')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async abrir(
    @Body() body: { mes: number; ano: number; nucleoId: string },
    @Req() req: Request & { user: { uid: string } },
  ) {
    return this.service.abrir(body.mes, body.ano, body.nucleoId, req.user.uid);
  }

  @Post('fechar')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async fechar(@Body() body: { mes: number; ano: number; nucleoId: string }) {
    return this.service.fechar(body.mes, body.ano, body.nucleoId);
  }

  @Post('reabrir/:id')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async reabrir(
    @Param('id') id: string,
    @Body() body: { justificativa: string },
    @Req() req: Request & { user: { uid: string } },
  ) {
    return this.service.reabrir(id, req.user.uid, body.justificativa);
  }
}
