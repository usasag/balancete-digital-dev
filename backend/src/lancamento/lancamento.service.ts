import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LancamentoFinanceiro } from './lancamento.entity';
import { DeepPartial } from 'typeorm';
import { BalanceteService } from '../balancete/balancete.service';
import { CaixaService } from '../caixa/caixa.service';
import { PeriodoService } from '../periodo/periodo.service';
import { Between } from 'typeorm';
import { LancamentoImportLog } from './lancamento-import-log.entity';
import { LancamentoTemplate } from './lancamento-template.entity';
import { EvidenciaMigracaoLog } from './evidencia-migracao-log.entity';
import { EvidenciaAuditoriaLog } from './evidencia-auditoria-log.entity';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { SalarioMinimoService } from '../salario-minimo/salario-minimo.service';

export interface ImportLancamentoRow {
  linha: number;
  tipo: 'RECEITA' | 'DESPESA';
  descricao: string;
  valor: number;
  categoria: string;
  subcategoria?: string;
  observacao?: string;
  data_movimento: Date;
  caixaId?: string;
  contaBancariaId?: string;
  status?: 'RASCUNHO' | 'REGISTRADO';
  comprovante_url?: string;
  tipoComprovante?: 'NOTA_FISCAL' | 'RECIBO';
}

export interface ImportLancamentoError {
  linha: number;
  mensagem: string;
}

export interface EvidenceMigrationRow {
  linha: number;
  entidade: 'LANCAMENTO' | 'MENSALIDADE';
  id: string;
  url: string;
}

@Injectable()
export class LancamentoService {
  constructor(
    @InjectRepository(LancamentoFinanceiro)
    private repo: Repository<LancamentoFinanceiro>,
    @InjectRepository(LancamentoImportLog)
    private importLogRepo: Repository<LancamentoImportLog>,
    @InjectRepository(LancamentoTemplate)
    private templateRepo: Repository<LancamentoTemplate>,
    @InjectRepository(EvidenciaMigracaoLog)
    private evidenceMigrationLogRepo: Repository<EvidenciaMigracaoLog>,
    @InjectRepository(EvidenciaAuditoriaLog)
    private evidenceAuditLogRepo: Repository<EvidenciaAuditoriaLog>,
    @Inject(forwardRef(() => BalanceteService))
    private balanceteService: BalanceteService,
    @Inject(forwardRef(() => CaixaService))
    private caixaService: CaixaService,
    @Inject(forwardRef(() => PeriodoService))
    private periodoService: PeriodoService,
    private configuracaoService: ConfiguracaoService,
    private salarioMinimoService: SalarioMinimoService,
  ) {}

  private async enforceEvidencePolicy(
    data: DeepPartial<LancamentoFinanceiro>,
    original?: LancamentoFinanceiro,
  ): Promise<void> {
    const tipo = (data.tipo || original?.tipo || '') as string;
    const status = (data.status || original?.status || '') as string;
    const valor = Number(data.valor ?? original?.valor ?? 0);
    const nucleoId = (data.nucleoId || original?.nucleoId || '') as string;
    const dataMovimento =
      (data.data_movimento as Date | undefined) || original?.data_movimento;

    if (tipo !== 'DESPESA' || status !== 'REGISTRADO') return;

    const comprovanteUrl =
      data.comprovante_url !== undefined
        ? data.comprovante_url
        : original?.comprovante_url;
    if (!comprovanteUrl) {
      data.status = 'RASCUNHO';
      return;
    }

    const tipoComprovante =
      (data.tipoComprovante as string | undefined) || original?.tipoComprovante;

    if (tipoComprovante !== 'RECIBO') return;
    if (!nucleoId || !dataMovimento) return;

    const config = await this.configuracaoService.findOneByNucleo(nucleoId);
    if (!config.politicaReciboSemNotaAtiva) return;

    const salarioMinimo = await this.salarioMinimoService.getByDate(
      new Date(dataMovimento),
    );
    const limite =
      Number(config.politicaReciboLimiteSalariosMinimos || 1) * salarioMinimo;

    if (valor > limite) {
      data.status = 'RASCUNHO';
    }
  }

  async findAllByMesAno(
    nucleoId: string,
    mes: number,
    ano: number,
  ): Promise<LancamentoFinanceiro[]> {
    // Construct start and end dates ensuring local/UTC handling aligned with how dates are stored.
    // Assuming simple checks.
    // Date filter can be tricky with TypeORM if timezone differs.
    // Simpler: filter by raw query or just fetch all for nucleo and filter in memory if volume is low,
    // but better to use `Between`.
    // Let's assume data_movimento is stored correctly.
    const start = new Date(ano, mes - 1, 1);
    const end = new Date(ano, mes, 0, 23, 59, 59);

    return this.repo.find({
      where: {
        nucleo: { id: nucleoId },
        data_movimento: Between(start, end),
      },
    });
  }

  async countRascunhos(
    nucleoId: string,
    mes: number,
    ano: number,
  ): Promise<number> {
    const start = new Date(ano, mes - 1, 1);
    const end = new Date(ano, mes, 0, 23, 59, 59);

    return this.repo.count({
      where: {
        nucleo: { id: nucleoId },
        data_movimento: Between(start, end),
        status: 'RASCUNHO',
      },
    });
  }

  async create(
    data: DeepPartial<LancamentoFinanceiro>,
  ): Promise<LancamentoFinanceiro> {
    const nucleoObj = data.nucleo as { id: string } | undefined;
    const nucleoId = nucleoObj?.id || data.nucleoId;

    if (nucleoId && data.data_movimento) {
      await this.periodoService.checkPermissao(
        data.data_movimento as Date,
        nucleoId,
      );
    }

    // If no caixa provided, use default (Tesouraria)
    if (!data.caixa && !data.caixaId && data.nucleo) {
      // assuming data.nucleo or data.nucleoId is present
      if (typeof nucleoId === 'string') {
        const defaultCaixa = await this.caixaService.findDefault(nucleoId);
        if (defaultCaixa) {
          data.caixa = defaultCaixa;
        }
      }
    }

    if (data.tipo === 'DESPESA') {
      if (!data.status) data.status = 'RASCUNHO';
    } else if (data.tipo === 'RECEITA') {
      if (!data.status) data.status = 'REGISTRADO';
    }

    await this.enforceEvidencePolicy(data);

    const lancamento = this.repo.create(data);
    const saved = await this.repo.save(lancamento);

    // Trigger update
    if (saved.nucleoId && saved.data_movimento) {
      await this.balanceteService.updateTotals(
        saved.nucleoId,
        saved.data_movimento,
      );
    }

    return saved;
  }

  async findAllByNucleo(nucleoId: string): Promise<LancamentoFinanceiro[]> {
    return this.repo.find({
      where: { nucleo: { id: nucleoId } },
      relations: ['criadoPor', 'nucleo', 'caixa'],
      order: { data_movimento: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LancamentoFinanceiro> {
    const lancamento = await this.repo.findOne({
      where: { id },
      relations: ['nucleo', 'criadoPor', 'caixa'],
    });
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');
    return lancamento;
  }

  async update(
    id: string,
    data: DeepPartial<LancamentoFinanceiro>,
  ): Promise<LancamentoFinanceiro> {
    // Get original for nucleoId/date in case they changed (or if not provided in data)
    const original = await this.findOne(id);

    // Check Periodo Permissao (Original Date)
    if (original.data_movimento && original.nucleoId) {
      await this.periodoService.checkPermissao(
        original.data_movimento,
        original.nucleoId,
      );
    }

    // Check Periodo Permissao (New Date) if changing
    const newDataMovimento = data.data_movimento;
    if (newDataMovimento) {
      // If data.nucleoId is provided use it, otherwise use original
      const nucleoId = data.nucleoId || original.nucleoId;
      await this.periodoService.checkPermissao(
        newDataMovimento as Date,
        nucleoId,
      );
    }

    await this.enforceEvidencePolicy(data, original);

    await this.repo.update(id, data);
    const updated = await this.findOne(id);

    // Update totals for both old and new dates (if date changed)
    if (original.nucleoId && original.data_movimento) {
      await this.balanceteService.updateTotals(
        original.nucleoId,
        original.data_movimento,
      );
    }
    if (
      updated.nucleoId &&
      updated.data_movimento &&
      updated.data_movimento !== original.data_movimento
    ) {
      await this.balanceteService.updateTotals(
        updated.nucleoId,
        updated.data_movimento,
      );
    }

    return updated;
  }

  async clearEvidence(id: string): Promise<LancamentoFinanceiro> {
    const original = await this.findOne(id);

    if (original.data_movimento && original.nucleoId) {
      await this.periodoService.checkPermissao(
        original.data_movimento,
        original.nucleoId,
      );
    }

    await this.repo.update(id, {
      comprovante_url: null,
      evidenciaDriveFileId: null,
      evidenciaDriveFolderId: null,
      evidenciaWebViewLink: null,
      status: original.tipo === 'DESPESA' ? 'RASCUNHO' : original.status,
    } as unknown as DeepPartial<LancamentoFinanceiro>);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const original = await this.repo.findOne({ where: { id } });
    if (!original) throw new NotFoundException('Lançamento não encontrado');

    // Check Permission
    if (original.nucleoId && original.data_movimento) {
      await this.periodoService.checkPermissao(
        original.data_movimento,
        original.nucleoId,
      );
    }

    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Lançamento não encontrado');
    }

    if (original.nucleoId && original.data_movimento) {
      await this.balanceteService.updateTotals(
        original.nucleoId,
        original.data_movimento,
      );
    }
  }

  buildImportPreview(rawRows: Record<string, unknown>[]): {
    validRows: ImportLancamentoRow[];
    errors: ImportLancamentoError[];
  } {
    const validRows: ImportLancamentoRow[] = [];
    const errors: ImportLancamentoError[] = [];

    rawRows.forEach((raw, index) => {
      const linha = index + 2;
      const tipoRaw = String(raw.tipo || '')
        .trim()
        .toUpperCase();
      const descricao = String(raw.descricao || '').trim();
      const categoria = String(raw.categoria || '').trim() || 'Geral';
      const valorRaw = String(raw.valor || '').trim().replace(',', '.');
      const dataRaw = String(raw.data_movimento || '').trim();
      const statusRaw = String(raw.status || '')
        .trim()
        .toUpperCase();

      if (tipoRaw !== 'RECEITA' && tipoRaw !== 'DESPESA') {
        errors.push({
          linha,
          mensagem: 'Tipo inválido. Use RECEITA ou DESPESA.',
        });
        return;
      }

      if (!descricao) {
        errors.push({ linha, mensagem: 'Descrição é obrigatória.' });
        return;
      }

      const valor = Number(valorRaw);
      if (!Number.isFinite(valor) || valor <= 0) {
        errors.push({ linha, mensagem: 'Valor inválido. Informe número > 0.' });
        return;
      }

      const dataMovimento = new Date(dataRaw);
      if (Number.isNaN(dataMovimento.getTime())) {
        errors.push({ linha, mensagem: 'Data inválida em data_movimento.' });
        return;
      }

      const statusDefault =
        tipoRaw === 'RECEITA'
          ? ('REGISTRADO' as const)
          : ('RASCUNHO' as const);

      const statusNormalized =
        statusRaw === 'RASCUNHO' || statusRaw === 'REGISTRADO'
          ? (statusRaw as 'RASCUNHO' | 'REGISTRADO')
          : statusDefault;

      validRows.push({
        linha,
        tipo: tipoRaw as 'RECEITA' | 'DESPESA',
        descricao,
        valor,
        categoria,
        subcategoria: String(raw.subcategoria || '').trim() || undefined,
        observacao: String(raw.observacao || '').trim() || undefined,
        data_movimento: dataMovimento,
        caixaId: String(raw.caixaId || '').trim() || undefined,
        contaBancariaId:
          String(raw.contaBancariaId || '').trim() || undefined,
        status: statusNormalized,
        comprovante_url: String(raw.comprovante_url || '').trim() || undefined,
        tipoComprovante:
          String(raw.tipoComprovante || '').trim().toUpperCase() === 'RECIBO'
            ? 'RECIBO'
            : 'NOTA_FISCAL',
      });
    });

    return { validRows, errors };
  }

  async createImportLog(data: {
    nucleoId: string;
    usuarioId: string;
    arquivoNome: string;
    totalLinhas: number;
    linhasValidas: number;
    linhasCriadas: number;
    linhasComErro: number;
    erros: Array<{ linha: number; mensagem: string }>;
  }): Promise<LancamentoImportLog> {
    const log = this.importLogRepo.create({
      nucleoId: data.nucleoId,
      usuarioId: data.usuarioId,
      arquivoNome: data.arquivoNome,
      totalLinhas: data.totalLinhas,
      linhasValidas: data.linhasValidas,
      linhasCriadas: data.linhasCriadas,
      linhasComErro: data.linhasComErro,
      erros: data.erros.length > 0 ? data.erros : null,
    });

    return this.importLogRepo.save(log);
  }

  async findImportLogsByNucleo(nucleoId: string): Promise<LancamentoImportLog[]> {
    return this.importLogRepo.find({
      where: { nucleoId },
      relations: ['usuario'],
      order: { dataCriacao: 'DESC' },
    });
  }

  async findTemplatesByNucleo(nucleoId: string): Promise<LancamentoTemplate[]> {
    return this.templateRepo.find({
      where: { nucleoId, ativo: true },
      order: { nome: 'ASC' },
    });
  }

  parseEvidenceMigrationPreview(rawRows: Record<string, unknown>[]): {
    validRows: EvidenceMigrationRow[];
    errors: ImportLancamentoError[];
  } {
    const validRows: EvidenceMigrationRow[] = [];
    const errors: ImportLancamentoError[] = [];

    rawRows.forEach((raw, index) => {
      const linha = index + 2;
      const entidade = String(raw.entidade || '')
        .trim()
        .toUpperCase();
      const id = String(raw.id || '').trim();
      const url = String(raw.url || '').trim();

      if (entidade !== 'LANCAMENTO' && entidade !== 'MENSALIDADE') {
        errors.push({
          linha,
          mensagem: 'Entidade inválida. Use LANCAMENTO ou MENSALIDADE.',
        });
        return;
      }

      if (!id) {
        errors.push({ linha, mensagem: 'ID é obrigatório.' });
        return;
      }

      if (!url) {
        errors.push({ linha, mensagem: 'URL é obrigatória.' });
        return;
      }

      validRows.push({
        linha,
        entidade: entidade as 'LANCAMENTO' | 'MENSALIDADE',
        id,
        url,
      });
    });

    return { validRows, errors };
  }

  async createEvidenceMigrationLog(data: {
    nucleoId: string;
    usuarioId: string;
    arquivoNome: string;
    totalLinhas: number;
    linhasProcessadas: number;
    linhasComErro: number;
    erros: Array<{ linha: number; mensagem: string }>;
  }): Promise<EvidenciaMigracaoLog> {
    const log = this.evidenceMigrationLogRepo.create({
      nucleoId: data.nucleoId,
      usuarioId: data.usuarioId,
      arquivoNome: data.arquivoNome,
      totalLinhas: data.totalLinhas,
      linhasProcessadas: data.linhasProcessadas,
      linhasComErro: data.linhasComErro,
      erros: data.erros.length > 0 ? data.erros : null,
    });

    return this.evidenceMigrationLogRepo.save(log);
  }

  async findEvidenceMigrationLogsByNucleo(
    nucleoId: string,
  ): Promise<EvidenciaMigracaoLog[]> {
    return this.evidenceMigrationLogRepo.find({
      where: { nucleoId },
      relations: ['usuario'],
      order: { dataCriacao: 'DESC' },
    });
  }

  async createEvidenceAuditLog(data: {
    entidade: 'LANCAMENTO' | 'MENSALIDADE';
    entidadeId: string;
    nucleoId: string;
    usuarioId: string;
    acao: 'ATTACH' | 'RELINK' | 'REMOVE' | 'MIGRATION_LINK';
    anterior: {
      comprovante_url?: string | null;
      evidenciaDriveFileId?: string | null;
      evidenciaWebViewLink?: string | null;
    } | null;
    novo: {
      comprovante_url?: string | null;
      evidenciaDriveFileId?: string | null;
      evidenciaWebViewLink?: string | null;
    } | null;
  }): Promise<EvidenciaAuditoriaLog> {
    const log = this.evidenceAuditLogRepo.create({
      entidade: data.entidade,
      entidadeId: data.entidadeId,
      nucleoId: data.nucleoId,
      usuarioId: data.usuarioId,
      acao: data.acao,
      anterior: data.anterior,
      novo: data.novo,
    });

    return this.evidenceAuditLogRepo.save(log);
  }

  async findEvidenceAuditLogsByNucleo(
    nucleoId: string,
    entidade?: 'LANCAMENTO' | 'MENSALIDADE',
    entidadeId?: string,
  ): Promise<EvidenciaAuditoriaLog[]> {
    return this.evidenceAuditLogRepo.find({
      where: {
        nucleoId,
        ...(entidade ? { entidade } : {}),
        ...(entidadeId ? { entidadeId } : {}),
      },
      relations: ['usuario'],
      order: { dataCriacao: 'DESC' },
    });
  }

  async createTemplate(data: DeepPartial<LancamentoTemplate>) {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  async duplicateFromPreviousMonth(
    nucleoId: string,
    referenceYear: number,
    referenceMonth: number,
    targetYear: number,
    targetMonth: number,
    createdById: string,
  ) {
    const referenceStart = new Date(referenceYear, referenceMonth - 1, 1);
    const referenceEnd = new Date(referenceYear, referenceMonth, 0, 23, 59, 59);
    const targetDate = new Date(targetYear, targetMonth - 1, 1);

    const source = await this.repo.find({
      where: {
        nucleo: { id: nucleoId },
        data_movimento: Between(referenceStart, referenceEnd),
      },
      order: { data_movimento: 'ASC' },
    });

    let created = 0;
    const errors: Array<{ sourceId: string; mensagem: string }> = [];

    for (const item of source) {
      try {
        await this.create({
          tipo: item.tipo,
          descricao: item.descricao,
          valor: Number(item.valor),
          categoria: item.categoria,
          subcategoria: item.subcategoria,
          observacao: item.observacao,
          status: item.tipo === 'DESPESA' ? 'RASCUNHO' : 'REGISTRADO',
          data_movimento: targetDate,
          nucleoId,
          caixaId: item.caixaId,
          criadoPorId: createdById,
        });
        created += 1;
      } catch (error) {
        errors.push({
          sourceId: item.id,
          mensagem: error instanceof Error ? error.message : 'Erro ao duplicar',
        });
      }
    }

    return {
      sourceCount: source.length,
      created,
      errors,
    };
  }
}
