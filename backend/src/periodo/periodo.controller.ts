import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PeriodoService } from './periodo.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestWithUser } from '../auth/request-with-user';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PermissionsService } from '../auth/permissions.service';
import { PermissionAction } from '../auth/permission-action.enum';

@Controller('periodos')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class PeriodoController {
  constructor(
    private service: PeriodoService,
    private auditoriaService: AuditoriaService,
    private permissionsService: PermissionsService,
  ) {}

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

  @Get('checklist')
  @Roles(
    Role.ADMIN_GLOBAL,
    Role.PRESIDENCIA,
    Role.TESOURARIA,
    Role.CONTABILIDADE_UNICA,
    Role.CONSELHO_FISCAL,
  )
  async checklist(
    @Query('mes') mesRaw: string,
    @Query('ano') anoRaw: string,
    @Query('nucleoId') nucleoId: string,
    @Req() req: RequestWithUser,
  ) {
    const mes = Number(mesRaw);
    const ano = Number(anoRaw);
    if (!nucleoId || !Number.isFinite(mes) || !Number.isFinite(ano)) {
      throw new BadRequestException('Parâmetros inválidos para checklist.');
    }
    if (req.user.nucleoId !== nucleoId && req.user.role !== Role.ADMIN_GLOBAL) {
      throw new BadRequestException('Núcleo inválido para o usuário autenticado.');
    }
    return this.service.getChecklist(mes, ano, nucleoId);
  }

  @Get('alertas/:nucleoId')
  @Roles(
    Role.ADMIN_GLOBAL,
    Role.PRESIDENCIA,
    Role.TESOURARIA,
    Role.CONTABILIDADE_UNICA,
    Role.CONSELHO_FISCAL,
  )
  async alertas(@Param('nucleoId') nucleoId: string, @Req() req: RequestWithUser) {
    if (req.user.nucleoId !== nucleoId && req.user.role !== Role.ADMIN_GLOBAL) {
      throw new BadRequestException('Núcleo inválido para o usuário autenticado.');
    }
    return this.service.getAlertas(nucleoId);
  }

  @Post('abrir')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async abrir(
    @Body() body: { mes: number; ano: number; nucleoId: string },
    @Req() req: RequestWithUser,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.PERIODO_MANAGE);
    const before = await this.service.findOne(body.mes, body.ano, body.nucleoId);
    const periodo = await this.service.abrir(
      body.mes,
      body.ano,
      body.nucleoId,
      req.user.id,
    );
    await this.auditoriaService.log({
      entidade: 'PERIODO',
      entidadeId: periodo.id,
      acao: before ? 'OPEN_IDEMPOTENT' : 'OPEN',
      nucleoId: body.nucleoId,
      usuarioId: req.user.id,
      beforeData: before
        ? {
            status: before.status,
            data_fechamento: before.data_fechamento,
          }
        : null,
      afterData: {
        status: periodo.status,
        data_fechamento: periodo.data_fechamento,
      },
    });
    return periodo;
  }

  @Post('fechar')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async fechar(
    @Body() body: { mes: number; ano: number; nucleoId: string },
    @Req() req: RequestWithUser,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.PERIODO_MANAGE);
    const before = await this.service.findOne(body.mes, body.ano, body.nucleoId);
    const periodo = await this.service.fechar(body.mes, body.ano, body.nucleoId);
    await this.auditoriaService.log({
      entidade: 'PERIODO',
      entidadeId: periodo.id,
      acao: 'CLOSE',
      nucleoId: body.nucleoId,
      usuarioId: req.user.id,
      beforeData: before
        ? {
            status: before.status,
            data_fechamento: before.data_fechamento,
          }
        : null,
      afterData: {
        status: periodo.status,
        data_fechamento: periodo.data_fechamento,
      },
    });
    return periodo;
  }

  @Post('reabrir/:id')
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async reabrir(
    @Param('id') id: string,
    @Body() body: { justificativa: string },
    @Req() req: RequestWithUser,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.PERIODO_MANAGE);
    const periodoBefore = await this.service.findById(id);
    const periodo = await this.service.reabrir(id, req.user.id, body.justificativa);
    await this.auditoriaService.log({
      entidade: 'PERIODO',
      entidadeId: periodo.id,
      acao: 'REOPEN',
      nucleoId: periodo.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        status: periodoBefore.status,
        reaberturas: periodoBefore.reaberturas,
      },
      afterData: {
        status: periodo.status,
        reaberturas: periodo.reaberturas,
      },
      metadata: {
        justificativa: body.justificativa,
      },
    });
    return periodo;
  }
}
