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
  status?: 'RASCUNHO' | 'REGISTRADO';
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

  private parseImportRowsFromFile(file: MulterFile): Record<string, unknown>[] {
    const lowerName = file.originalname.toLowerCase();
    if (lowerName.endsWith('.ofx')) {
      const content = file.buffer.toString('utf-8');
      const txs = parseOfxTransactions(content);
      return ofxTransactionsToImportRows(txs);
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

    return this.service.create(data);
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  importPreview(@UploadedFile() file?: MulterFile) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório para prévia.');
    }
    const rows = this.parseImportRowsFromFile(file);
    return this.service.buildImportPreview(rows);
  }

  @Post('import/execute')
  @UseInterceptors(FileInterceptor('file'))
  async importExecute(
    @Request() req: { user: Usuario },
    @UploadedFile() file?: MulterFile,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório para importação.');
    }

    const nucleoId = req.user.nucleoId;
    if (!nucleoId) {
      throw new BadRequestException('Usuário sem núcleo vinculado.');
    }

    const rows = this.parseImportRowsFromFile(file);
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
          status: row.status,
          comprovante_url: row.comprovante_url,
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
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() body: CreateLancamentoBody,
    @UploadedFile() file?: MulterFile,
  ) {
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

    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
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
