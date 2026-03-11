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
  status?: 'RASCUNHO' | 'REGISTRADO';
  comprovante_url?: string;
}

export interface ImportLancamentoError {
  linha: number;
  mensagem: string;
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
    @Inject(forwardRef(() => BalanceteService))
    private balanceteService: BalanceteService,
    @Inject(forwardRef(() => CaixaService))
    private caixaService: CaixaService,
    @Inject(forwardRef(() => PeriodoService))
    private periodoService: PeriodoService,
  ) {}

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
    // If no caixa provided, use default (Tesouraria)
    if (!data.caixa && !data.caixaId && data.nucleo) {
      // assuming data.nucleo or data.nucleoId is present
      const nucleoObj = data.nucleo as { id: string } | undefined;
      const nucleoId = nucleoObj?.id || data.nucleoId;
      if (typeof nucleoId === 'string') {
        const defaultCaixa = await this.caixaService.findDefault(nucleoId);
        if (defaultCaixa) {
          data.caixa = defaultCaixa;
        }
      }
    }

    // Validation for DESPESA and REGISTRADO status
    if (data.tipo === 'DESPESA') {
      if (data.status === 'REGISTRADO') {
        if (!data.comprovante_url) {
          // If user tries to force REGISTRADO without proof, we can either throw error or downgrade to RASCUNHO.
          // Requirement: "Enforcing a rule that an expense entry can only be changed to 'Registrado' status when all mandatory fields... are complete."
          // I will throw an error to be explicit, or just set it to RASCUNHO?
          // "Automatically setting the status to 'Rascunho' ... if a fiscal evidence is not provided."
          data.status = 'RASCUNHO';
        }
      } else {
        // Explicitly set to RASCUNHO if not specified, or if it is RASCUNHO
        if (!data.status) data.status = 'RASCUNHO';
      }
    } else if (data.tipo === 'RECEITA') {
      // Receitas presumably default to REGISTRADO or RASCUNHO?
      // User didn't specify strict flow for Receita validation yet, but mentioned "single bank statement... for multiple revenue transactions".
      // For now, let's allow Receita to be REGISTRADO by default if not specified, or respect input.
      if (!data.status) data.status = 'REGISTRADO';
    }

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

    // Validation for DESPESA and REGISTRADO status during update
    if (original.tipo === 'DESPESA' || data.tipo === 'DESPESA') {
      const isDespesa =
        data.tipo === 'DESPESA' || (original.tipo === 'DESPESA' && !data.tipo);
      if (isDespesa) {
        const newStatus = data.status || original.status;
        const newComprovante =
          data.comprovante_url !== undefined
            ? data.comprovante_url
            : original.comprovante_url;

        if (newStatus === 'REGISTRADO') {
          if (!newComprovante) {
            // If trying to set/keep REGISTRADO without proof, force RASCUNHO
            data.status = 'RASCUNHO';
          }
        }
      }
    }

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
        status: statusNormalized,
        comprovante_url: String(raw.comprovante_url || '').trim() || undefined,
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
