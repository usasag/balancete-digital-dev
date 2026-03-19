import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LancamentoService } from './lancamento.service';
import { AuthGuard } from '@nestjs/passport';
import { LancamentoFinanceiro } from './lancamento.entity';
import * as typeorm from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from 'src/common/enums/role.enum';
import { FileStorageService } from '../file-storage/file-storage.service';
import * as XLSX from 'xlsx';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { parseOfxTransactions, ofxTransactionsToImportRows } from './ofx-parser';
import { MensalidadeService } from '../mensalidade/mensalidade.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PermissionsService } from '../auth/permissions.service';
import { PermissionAction } from '../auth/permission-action.enum';

// Define the Multer file type explicitly since Express types may not be available globally
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface CreateLancamentoBody {
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  valor: string | number;
  categoria: string;
  subcategoria?: string;
  observacao?: string;
  data_movimento: string;
  nucleoId: string;
  criadoPorId: string;
  caixaId?: string;
  contaBancariaId?: string;
  status?: 'RASCUNHO' | 'REGISTRADO';
  tipoComprovante?: 'NOTA_FISCAL' | 'RECIBO';
}

interface ImportDefaultsBody {
  caixaId?: string;
  contaBancariaId?: string;
}

interface ImportResult {
  created: number;
  errors: { linha: number; mensagem: string }[];
}

@Controller('lancamentos')
@UseGuards(AuthGuard('firebase-jwt'))
export class LancamentoController {
  constructor(
    private readonly service: LancamentoService,
    private readonly fileStorageService: FileStorageService,
    private readonly mensalidadeService: MensalidadeService,
    private readonly auditoriaService: AuditoriaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private parseSpreadsheet(file: MulterFile): Record<string, unknown>[] {
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('Arquivo sem planilha válida.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
  }

  private parseImportRowsFromFile(
    file: MulterFile,
    defaults?: ImportDefaultsBody,
  ): Record<string, unknown>[] {
    const lowerName = file.originalname.toLowerCase();
    if (lowerName.endsWith('.ofx')) {
      const content = file.buffer.toString('utf-8');
      const txs = parseOfxTransactions(content);
      return ofxTransactionsToImportRows(txs, {
        caixaId: defaults?.caixaId,
        contaBancariaId: defaults?.contaBancariaId,
      });
    }
    return this.parseSpreadsheet(file);
  }

  private parseEvidenceRowsFromFile(file: MulterFile): Record<string, unknown>[] {
    const lowerName = file.originalname.toLowerCase();
    if (lowerName.endsWith('.ofx')) {
      throw new BadRequestException('Arquivo OFX não é suportado para migração.');
    }
    return this.parseSpreadsheet(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Request() req: { user: Usuario },
    @Body() body: CreateLancamentoBody,
    @UploadedFile() file?: MulterFile,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.LANCAMENTO_CREATE);
    let comprovante_url: string | undefined;
    let evidenciaDriveFileId: string | undefined;
    let evidenciaDriveFolderId: string | undefined;
    let evidenciaWebViewLink: string | undefined;

    if (file) {
      const uploaded = await this.fileStorageService.uploadFileWithMetadata(
        file.buffer,
        file.originalname,
        file.mimetype,
        body.nucleoId,
        {
          tipo: body.tipo,
          dataMovimento: new Date(body.data_movimento),
          domain: 'lancamento',
        },
      );
      comprovante_url = uploaded.url;
      evidenciaDriveFileId = uploaded.driveFileId || undefined;
      evidenciaDriveFolderId = uploaded.driveFolderId || undefined;
      evidenciaWebViewLink = uploaded.webViewLink || undefined;
    }

    const data: typeorm.DeepPartial<LancamentoFinanceiro> = {
      ...body,
      valor:
        typeof body.valor === 'string' ? parseFloat(body.valor) : body.valor,
      comprovante_url,
      evidenciaDriveFileId,
      evidenciaDriveFolderId,
      evidenciaWebViewLink,
    };

    const created = await this.service.create(data);
    await this.auditoriaService.log({
      entidade: 'LANCAMENTO',
      entidadeId: created.id,
      acao: 'CREATE',
      nucleoId: created.nucleoId,
      usuarioId: req.user.id,
      beforeData: null,
      afterData: {
        tipo: created.tipo,
        status: created.status,
        valor: created.valor,
        categoria: created.categoria,
        subcategoria: created.subcategoria,
        data_movimento: created.data_movimento,
        tipoComprovante: created.tipoComprovante,
      },
    });
    return created;
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  importPreview(
    @UploadedFile() file?: MulterFile,
    @Body() body?: ImportDefaultsBody,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório para prévia.');
    }
    const rows = this.parseImportRowsFromFile(file, body);
    return this.service.buildImportPreview(rows);
  }

  @Post('import/execute')
  @UseInterceptors(FileInterceptor('file'))
  async importExecute(
    @Request() req: { user: Usuario },
    @UploadedFile() file?: MulterFile,
    @Body() body?: ImportDefaultsBody,
  ): Promise<ImportResult> {
    this.permissionsService.ensure(req.user, PermissionAction.LANCAMENTO_IMPORT);
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório para importação.');
    }

    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    const rows = this.parseImportRowsFromFile(file, body);
    const preview = this.service.buildImportPreview(rows);
    const errors = [...preview.errors];
    let created = 0;

    for (const row of preview.validRows) {
      try {
        await this.service.create({
          tipo: row.tipo,
          descricao: row.descricao,
          valor: row.valor,
          categoria: row.categoria,
          subcategoria: row.subcategoria,
          observacao: row.observacao,
          data_movimento: row.data_movimento,
          nucleoId,
          criadoPorId: req.user.id,
          caixaId: row.caixaId,
          contaBancariaId: row.contaBancariaId,
          status: row.status,
          comprovante_url: row.comprovante_url,
          tipoComprovante: row.tipoComprovante,
        });
        created += 1;
      } catch (error) {
        errors.push({
          linha: row.linha,
          mensagem: error instanceof Error ? error.message : 'Erro ao importar',
        });
      }
    }

    await this.service.createImportLog({
      nucleoId,
      usuarioId: req.user.id,
      arquivoNome: file.originalname,
      totalLinhas: rows.length,
      linhasValidas: preview.validRows.length,
      linhasCriadas: created,
      linhasComErro: errors.length,
      erros: errors,
    });

    return { created, errors };
  }

  @Get('import/logs')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  async getImportLogs(@Request() req: { user: Usuario }) {
    const nucleoId = req.user.nucleoId;
    const role = req.user.role;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }
    if (role !== Role.TESOURARIA && role !== Role.ADMIN_GLOBAL) {
      throw new ForbiddenException('Acesso restrito a tesouraria e admins.');
    }
    return this.service.findImportLogsByNucleo(nucleoId);
  }

  @Post('import/evidencias/preview')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  @UseInterceptors(FileInterceptor('file'))
  importEvidencePreview(@UploadedFile() file?: MulterFile) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório para prévia.');
    }

    const rows = this.parseEvidenceRowsFromFile(file);
    return this.service.parseEvidenceMigrationPreview(rows);
  }

  @Post('import/evidencias/execute')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  @UseInterceptors(FileInterceptor('file'))
  async importEvidenceExecute(
    @Request() req: { user: Usuario },
    @UploadedFile() file?: MulterFile,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.EVIDENCIA_MANAGE);
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório para importação.');
    }

    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    const rows = this.parseEvidenceRowsFromFile(file);
    const preview = this.service.parseEvidenceMigrationPreview(rows);
    const errors = [...preview.errors];
    let processed = 0;

    for (const row of preview.validRows) {
      try {
        if (row.entidade === 'LANCAMENTO') {
          const lancamento = await this.service.findOne(row.id);
          if (lancamento.nucleoId !== nucleoId) {
            throw new Error('Lançamento fora do núcleo do usuário.');
          }

          const anterior = {
            comprovante_url: lancamento.comprovante_url || null,
            evidenciaDriveFileId: lancamento.evidenciaDriveFileId || null,
            evidenciaWebViewLink: lancamento.evidenciaWebViewLink || null,
          };

          await this.service.update(row.id, {
            comprovante_url: row.url,
            evidenciaWebViewLink: row.url,
          });
          await this.service.createEvidenceAuditLog({
            entidade: 'LANCAMENTO',
            entidadeId: lancamento.id,
            nucleoId,
            usuarioId: req.user.id,
            acao: 'MIGRATION_LINK',
            anterior,
            novo: {
              comprovante_url: row.url,
              evidenciaWebViewLink: row.url,
            },
          });
          processed += 1;
          continue;
        }

        const mensalidade = await this.mensalidadeService.findOne(row.id);
        if (mensalidade.nucleoId !== nucleoId) {
          throw new Error('Mensalidade fora do núcleo do usuário.');
        }

        const anterior = {
          evidenciaDriveFileId: mensalidade.evidenciaDriveFileId || null,
          evidenciaWebViewLink: mensalidade.evidenciaWebViewLink || null,
        };

        await this.mensalidadeService.update(row.id, {
          evidenciaWebViewLink: row.url,
        });
        await this.service.createEvidenceAuditLog({
          entidade: 'MENSALIDADE',
          entidadeId: mensalidade.id,
          nucleoId,
          usuarioId: req.user.id,
          acao: 'MIGRATION_LINK',
          anterior,
          novo: {
            evidenciaWebViewLink: row.url,
          },
        });
        processed += 1;
      } catch (error) {
        errors.push({
          linha: row.linha,
          mensagem: error instanceof Error ? error.message : 'Erro ao migrar',
        });
      }
    }

    await this.service.createEvidenceMigrationLog({
      nucleoId,
      usuarioId: req.user.id,
      arquivoNome: file.originalname,
      totalLinhas: rows.length,
      linhasProcessadas: processed,
      linhasComErro: errors.length,
      erros: errors,
    });

    return { processed, errors };
  }

  @Get('import/evidencias/logs')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  async getEvidenceMigrationLogs(@Request() req: { user: Usuario }) {
    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    return this.service.findEvidenceMigrationLogsByNucleo(nucleoId);
  }

  @Get('evidencia/auditoria/logs')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  async getEvidenceAuditLogs(
    @Request() req: { user: Usuario },
    @Query('entidade') entidade?: 'LANCAMENTO' | 'MENSALIDADE',
    @Query('entidadeId') entidadeId?: string,
  ) {
    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    return this.service.findEvidenceAuditLogsByNucleo(
      nucleoId,
      entidade,
      entidadeId,
    );
  }

  @Post('receitas/evidencia-compartilhada')
  async vincularEvidenciaReceitas(
    @Request() req: { user: Usuario },
    @Body()
    body: {
      caixaId: string;
      dataInicio: string;
      dataFim: string;
      comprovante_url: string;
    },
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.EVIDENCIA_MANAGE);
    const { caixaId, dataInicio, dataFim, comprovante_url } = body;
    if (!caixaId || !dataInicio || !dataFim || !comprovante_url) {
      throw new BadRequestException(
        'caixaId, dataInicio, dataFim e comprovante_url são obrigatórios.',
      );
    }

    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      throw new BadRequestException('Período de datas inválido.');
    }

    const lancamentos = await this.service.findAllByNucleo(nucleoId);
    const receitasAlvo = lancamentos.filter((l) => {
      const data = new Date(l.data_movimento);
      return (
        l.tipo === 'RECEITA' &&
        l.caixaId === caixaId &&
        data.getTime() >= inicio.getTime() &&
        data.getTime() <= fim.getTime()
      );
    });

    for (const receita of receitasAlvo) {
      await this.service.update(receita.id, { comprovante_url });
    }

    return {
      updated: receitasAlvo.length,
      message:
        'Evidência compartilhada vinculada às receitas do período informado.',
    };
  }

  @Get('evidencia/drive-status')
  getDriveStatus() {
    return {
      provider: this.fileStorageService.getProviderName(),
      driveConfigured: this.fileStorageService.isDriveConfigured(),
    };
  }

  @Get('nucleo/:id')
  async findAllByNucleo(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
  ) {
    const lancamentos = await this.service.findAllByNucleo(id);
    const userRole = req.user?.role;

    if (
      userRole === Role.CONTABILIDADE_UNICA ||
      userRole === Role.CONSELHO_FISCAL ||
      userRole === Role.SOCIO
    ) {
      return lancamentos.map((l) => {
        if (l.categoria === 'Mensalidade') {
          return { ...l, descricao: 'Mensalidade (Sócio Oculto)' };
        }
        return l;
      });
    }

    return lancamentos;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const lancamento = await this.service.findOne(id);
    const health = await this.fileStorageService.checkEvidenceReference({
      driveFileId: lancamento.evidenciaDriveFileId,
      url: lancamento.evidenciaWebViewLink || lancamento.comprovante_url,
    });

    return {
      ...lancamento,
      evidenciaStatus: health.status,
      evidenciaStatusMessage: health.message,
    };
  }

  @Get(':id/evidencia/health')
  async getEvidenceHealth(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
  ) {
    const lancamento = await this.service.findOne(id);
    if (lancamento.nucleoId !== req.user.nucleoId) {
      throw new ForbiddenException('Lançamento fora do núcleo do usuário.');
    }

    const health = await this.fileStorageService.checkEvidenceReference({
      driveFileId: lancamento.evidenciaDriveFileId,
      url: lancamento.evidenciaWebViewLink || lancamento.comprovante_url,
    });

    return {
      id: lancamento.id,
      status: health.status,
      message: health.message,
    };
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Request() req: { user: Usuario },
    @Body() body: CreateLancamentoBody,
    @UploadedFile() file?: MulterFile,
  ) {
    this.permissionsService.ensure(req.user, PermissionAction.LANCAMENTO_EDIT);
    const before = await this.service.findOne(id);
    let comprovante_url: string | undefined;
    let evidenciaDriveFileId: string | undefined;
    let evidenciaDriveFolderId: string | undefined;
    let evidenciaWebViewLink: string | undefined;

    if (file) {
      const uploaded = await this.fileStorageService.uploadFileWithMetadata(
        file.buffer,
        file.originalname,
        file.mimetype,
        body.nucleoId,
        {
          tipo: body.tipo,
          dataMovimento: new Date(body.data_movimento),
          domain: 'lancamento',
        },
      );
      comprovante_url = uploaded.url;
      evidenciaDriveFileId = uploaded.driveFileId || undefined;
      evidenciaDriveFolderId = uploaded.driveFolderId || undefined;
      evidenciaWebViewLink = uploaded.webViewLink || undefined;
    }

    const data: typeorm.DeepPartial<LancamentoFinanceiro> = {
      ...body,
      valor:
        typeof body.valor === 'string' ? parseFloat(body.valor) : body.valor,
      ...(comprovante_url && { comprovante_url }),
      ...(evidenciaDriveFileId && { evidenciaDriveFileId }),
      ...(evidenciaDriveFolderId && { evidenciaDriveFolderId }),
      ...(evidenciaWebViewLink && { evidenciaWebViewLink }),
    };

    const updated = await this.service.update(id, data);
    await this.auditoriaService.log({
      entidade: 'LANCAMENTO',
      entidadeId: updated.id,
      acao: 'UPDATE',
      nucleoId: updated.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        tipo: before.tipo,
        status: before.status,
        valor: before.valor,
        categoria: before.categoria,
        subcategoria: before.subcategoria,
        data_movimento: before.data_movimento,
        tipoComprovante: before.tipoComprovante,
      },
      afterData: {
        tipo: updated.tipo,
        status: updated.status,
        valor: updated.valor,
        categoria: updated.categoria,
        subcategoria: updated.subcategoria,
        data_movimento: updated.data_movimento,
        tipoComprovante: updated.tipoComprovante,
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

    const lancamento = await this.service.findOne(id);
    if (lancamento.nucleoId !== req.user.nucleoId) {
      throw new ForbiddenException('Lançamento fora do núcleo do usuário.');
    }

    const anterior = {
      comprovante_url: lancamento.comprovante_url || null,
      evidenciaDriveFileId: lancamento.evidenciaDriveFileId || null,
      evidenciaWebViewLink: lancamento.evidenciaWebViewLink || null,
    };

    const uploaded = await this.fileStorageService.uploadFileWithMetadata(
      file.buffer,
      file.originalname,
      file.mimetype,
      lancamento.nucleoId,
      {
        tipo: (lancamento.tipo as 'RECEITA' | 'DESPESA') || 'DESPESA',
        dataMovimento: new Date(lancamento.data_movimento),
        domain: 'lancamento',
      },
    );

    const updated = await this.service.update(id, {
      comprovante_url: uploaded.url,
      evidenciaDriveFileId: uploaded.driveFileId || undefined,
      evidenciaDriveFolderId: uploaded.driveFolderId || undefined,
      evidenciaWebViewLink: uploaded.webViewLink || undefined,
      tipoComprovante: 'NOTA_FISCAL',
      status: 'REGISTRADO',
    });

    await this.service.createEvidenceAuditLog({
      entidade: 'LANCAMENTO',
      entidadeId: lancamento.id,
      nucleoId: lancamento.nucleoId,
      usuarioId: req.user.id,
      acao: anterior.comprovante_url ? 'RELINK' : 'ATTACH',
      anterior,
      novo: {
        comprovante_url: updated.comprovante_url || null,
        evidenciaDriveFileId: updated.evidenciaDriveFileId || null,
        evidenciaWebViewLink: updated.evidenciaWebViewLink || null,
      },
    });

    return updated;
  }

  @Delete(':id/evidencia')
  async clearEvidence(@Param('id') id: string, @Request() req: { user: Usuario }) {
    this.permissionsService.ensure(req.user, PermissionAction.EVIDENCIA_MANAGE);
    const lancamento = await this.service.findOne(id);
    if (lancamento.nucleoId !== req.user.nucleoId) {
      throw new ForbiddenException('Lançamento fora do núcleo do usuário.');
    }
    const anterior = {
      comprovante_url: lancamento.comprovante_url || null,
      evidenciaDriveFileId: lancamento.evidenciaDriveFileId || null,
      evidenciaWebViewLink: lancamento.evidenciaWebViewLink || null,
    };

    const updated = await this.service.clearEvidence(id);
    await this.service.createEvidenceAuditLog({
      entidade: 'LANCAMENTO',
      entidadeId: lancamento.id,
      nucleoId: lancamento.nucleoId,
      usuarioId: req.user.id,
      acao: 'REMOVE',
      anterior,
      novo: {
        comprovante_url: updated.comprovante_url || null,
        evidenciaDriveFileId: updated.evidenciaDriveFileId || null,
        evidenciaWebViewLink: updated.evidenciaWebViewLink || null,
      },
    });

    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: { user: Usuario }) {
    this.permissionsService.ensure(req.user, PermissionAction.LANCAMENTO_DELETE);
    const before = await this.service.findOne(id);
    await this.service.remove(id);
    await this.auditoriaService.log({
      entidade: 'LANCAMENTO',
      entidadeId: id,
      acao: 'DELETE',
      nucleoId: before.nucleoId,
      usuarioId: req.user.id,
      beforeData: {
        tipo: before.tipo,
        status: before.status,
        valor: before.valor,
        categoria: before.categoria,
        subcategoria: before.subcategoria,
        data_movimento: before.data_movimento,
      },
      afterData: null,
    });
    return { success: true };
  }

  @Get('templates/nucleo/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  getTemplatesByNucleo(@Param('id') id: string) {
    return this.service.findTemplatesByNucleo(id);
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  createTemplate(
    @Request() req: { user: Usuario },
    @Body()
    body: {
      nome: string;
      tipo: 'RECEITA' | 'DESPESA';
      categoria: string;
      subcategoria?: string;
      descricao: string;
      observacao?: string;
      valor: number;
      caixaId?: string;
    },
  ) {
    if (!req.user.nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    return this.service.createTemplate({
      nome: body.nome,
      tipo: body.tipo,
      categoria: body.categoria,
      subcategoria: body.subcategoria,
      descricao: body.descricao,
      observacao: body.observacao,
      valor: body.valor,
      caixaId: body.caixaId,
      nucleoId: req.user.nucleoId,
      criadoPorId: req.user.id,
    });
  }

  @Post('duplicate-previous-month')
  @UseGuards(RolesGuard)
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  duplicatePreviousMonth(
    @Request() req: { user: Usuario },
    @Body()
    body: {
      referenceYear: number;
      referenceMonth: number;
      targetYear: number;
      targetMonth: number;
    },
  ) {
    if (!req.user.nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    return this.service.duplicateFromPreviousMonth(
      req.user.nucleoId,
      body.referenceYear,
      body.referenceMonth,
      body.targetYear,
      body.targetMonth,
      req.user.id,
    );
  }
}
