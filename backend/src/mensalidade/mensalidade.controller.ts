import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { MensalidadeService } from './mensalidade.service';
import { AuthGuard } from '@nestjs/passport';
import { Mensalidade } from './mensalidade.entity';
import type { DeepPartial } from 'typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { Usuario } from '../usuario/usuario.entity';
import { FileStorageService } from '../file-storage/file-storage.service';
import { LancamentoService } from '../lancamento/lancamento.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PermissionsService } from '../auth/permissions.service';
import { PermissionAction } from '../auth/permission-action.enum';

interface MulterFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Controller('mensalidades')
@UseGuards(AuthGuard('firebase-jwt'))
export class MensalidadeController {
  constructor(
    private readonly service: MensalidadeService,
    private readonly fileStorageService: FileStorageService,
    private readonly lancamentoService: LancamentoService,
    private readonly auditoriaService: AuditoriaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('generate-now')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async generateNow() {
    return await this.service.generateNow();
  }

  @Post('generate-reference')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  generateReference(@Body() body: { nucleoId: string; mesReferencia: string }) {
    return this.service.generateForReference(body.nucleoId, body.mesReferencia);
  }

  @Post()
  create(@Body() data: DeepPartial<Mensalidade>) {
    return this.service.create(data);
  }

  @Get('nucleo/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  findAllByNucleo(@Param('id') id: string) {
    return this.service.findAllByNucleo(id);
  }

  @Get('socio/:id')
  findAllBySocio(@Param('id') id: string) {
    return this.service.findAllBySocio(id);
  }

  @Get('evidencia/drive-status')
  getDriveStatus() {
    return {
      provider: this.fileStorageService.getProviderName(),
      driveConfigured: this.fileStorageService.isDriveConfigured(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const mensalidade = await this.service.findOne(id);
    const health = await this.fileStorageService.checkEvidenceReference({
      driveFileId: mensalidade.evidenciaDriveFileId,
      url: mensalidade.evidenciaWebViewLink,
    });

    return {
      ...mensalidade,
      evidenciaStatus: health.status,
      evidenciaStatusMessage: health.message,
    };
  }

  @Get(':id/evidencia/health')
  async getEvidenceHealth(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
  ) {
    const mensalidade = await this.service.findOne(id);
    if (mensalidade.nucleoId !== req.user.nucleoId) {
      throw new ForbiddenException('Mensalidade fora do núcleo do usuário.');
    }

    const health = await this.fileStorageService.checkEvidenceReference({
      driveFileId: mensalidade.evidenciaDriveFileId,
      url: mensalidade.evidenciaWebViewLink,
    });

    return {
      id: mensalidade.id,
      status: health.status,
      message: health.message,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
    @Body() data: DeepPartial<Mensalidade>,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.MENSALIDADE_EDIT);
    const before = await this.service.findOne(id);
    const updated = await this.service.update(id, data);
    await this.auditoriaService.log({
      entidade: 'MENSALIDADE',
      entidadeId: updated.id,
      acao: 'UPDATE',
      nucleoId: updated.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        status: before.status,
        valor_total: before.valor_total,
        saldo_aberto: before.saldo_aberto,
        valor_pago_acumulado: before.valor_pago_acumulado,
      },
      afterData: {
        status: updated.status,
        valor_total: updated.valor_total,
        saldo_aberto: updated.saldo_aberto,
        valor_pago_acumulado: updated.valor_pago_acumulado,
      },
    });
    return updated;
  }

  @Post(':id/evidencia')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidence(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
    @UploadedFile() file?: MulterFile,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.EVIDENCIA_MANAGE);
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório.');
    }

    const mensalidade = await this.service.findOne(id);
    if (mensalidade.nucleoId !== req.user.nucleoId) {
      throw new ForbiddenException('Mensalidade fora do núcleo do usuário.');
    }

    const anterior = {
      evidenciaDriveFileId: mensalidade.evidenciaDriveFileId || null,
      evidenciaWebViewLink: mensalidade.evidenciaWebViewLink || null,
    };

    const updated = await this.service.uploadEvidence(id, file);
    await this.lancamentoService.createEvidenceAuditLog({
      entidade: 'MENSALIDADE',
      entidadeId: mensalidade.id,
      nucleoId: mensalidade.nucleoId,
      usuarioId: req.user.id,
      acao: anterior.evidenciaWebViewLink ? 'RELINK' : 'ATTACH',
      anterior,
      novo: {
        evidenciaDriveFileId: updated.evidenciaDriveFileId || null,
        evidenciaWebViewLink: updated.evidenciaWebViewLink || null,
      },
    });

    return updated;
  }

  @Delete(':id/evidencia')
  async clearEvidence(@Param('id') id: string, @Request() req: { user: Usuario }) {
    this.permissionsService.ensure(req.user, PermissionAction.EVIDENCIA_MANAGE);
    const mensalidade = await this.service.findOne(id);
    if (mensalidade.nucleoId !== req.user.nucleoId) {
      throw new ForbiddenException('Mensalidade fora do núcleo do usuário.');
    }
    const anterior = {
      evidenciaDriveFileId: mensalidade.evidenciaDriveFileId || null,
      evidenciaWebViewLink: mensalidade.evidenciaWebViewLink || null,
    };

    const updated = await this.service.clearEvidence(id);
    await this.lancamentoService.createEvidenceAuditLog({
      entidade: 'MENSALIDADE',
      entidadeId: mensalidade.id,
      nucleoId: mensalidade.nucleoId,
      usuarioId: req.user.id,
      acao: 'REMOVE',
      anterior,
      novo: {
        evidenciaDriveFileId: updated.evidenciaDriveFileId || null,
        evidenciaWebViewLink: updated.evidenciaWebViewLink || null,
      },
    });

    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: { user: Usuario }) {
    this.permissionsService.ensure(req.user, PermissionAction.MENSALIDADE_DELETE);
    const before = await this.service.findOne(id);
    await this.service.remove(id);
    await this.auditoriaService.log({
      entidade: 'MENSALIDADE',
      entidadeId: id,
      acao: 'DELETE',
      nucleoId: before.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        status: before.status,
        valor_total: before.valor_total,
        saldo_aberto: before.saldo_aberto,
      },
      afterData: null,
    });
    return { success: true };
  }

  @Post(':id/pay')
  async pay(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
    @Body()
    body: {
      date?: string;
      valor?: number;
      metodoPagamento?: 'PIX' | 'DINHEIRO' | 'TRANSFERENCIA' | 'OUTRO';
      recebidoPorId?: string;
      observacao?: string;
    },
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.MENSALIDADE_PAY);
    const before = await this.service.findOne(id);
    let result: Mensalidade;
    if (body.valor && Number(body.valor) > 0) {
      result = await this.service.registerPayment(id, {
        valor: Number(body.valor),
        metodoPagamento: body.metodoPagamento || 'PIX',
        dataPagamento: body.date ? new Date(body.date) : undefined,
        recebidoPorId: body.recebidoPorId,
        observacao: body.observacao,
      });
    } else {
      result = await this.service.pay(id, body.date ? new Date(body.date) : undefined);
    }

    await this.auditoriaService.log({
      entidade: 'MENSALIDADE',
      entidadeId: result.id,
      acao: 'PAY',
      nucleoId: result.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        status: before.status,
        saldo_aberto: before.saldo_aberto,
        valor_pago_acumulado: before.valor_pago_acumulado,
      },
      afterData: {
        status: result.status,
        saldo_aberto: result.saldo_aberto,
        valor_pago_acumulado: result.valor_pago_acumulado,
      },
      metadata: {
        valorInformado: body.valor,
        metodoPagamento: body.metodoPagamento || 'PIX',
      },
    });

    return result;
  }

  @Post('bulk/pay')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  payBulk(@Body() body: { ids: string[]; date?: string }) {
    return this.service.payBulk(
      body.ids || [],
      body.date ? new Date(body.date) : undefined,
    );
  }

  @Post(':id/agreement')
  async registerAgreement(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
    @Body() body: { date: string },
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.MENSALIDADE_AGREEMENT);
    const before = await this.service.findOne(id);
    const result = await this.service.registerAgreement(id, new Date(body.date));
    await this.auditoriaService.log({
      entidade: 'MENSALIDADE',
      entidadeId: result.id,
      acao: 'AGREEMENT',
      nucleoId: result.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        status: before.status,
        data_acordo: before.data_acordo,
      },
      afterData: {
        status: result.status,
        data_acordo: result.data_acordo,
      },
    });
    return result;
  }

  @Post(':id/taxa')
  addTaxa(@Param('id') id: string, @Body() body: { taxaId: string }) {
    return this.service.addTaxa(id, body.taxaId);
  }

  @Delete(':id/taxa/:index')
  removeTaxa(@Param('id') id: string, @Param('index') index: number) {
    return this.service.removeTaxa(id, index);
  }

  @Get('inadimplencia/:nucleoId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async getInadimplenciaReport(@Param('nucleoId') nucleoId: string) {
    return this.service.getInadimplenciaReport(nucleoId);
  }
}
