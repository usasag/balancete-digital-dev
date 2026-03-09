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

@Injectable()
export class LancamentoService {
  constructor(
    @InjectRepository(LancamentoFinanceiro)
    private repo: Repository<LancamentoFinanceiro>,
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
}
