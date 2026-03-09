import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Periodo, PeriodoStatus, ReaberturaLog } from './periodo.entity';
import { LancamentoService } from '../lancamento/lancamento.service';
import { BalanceteService } from '../balancete/balancete.service';

@Injectable()
export class PeriodoService {
  constructor(
    @InjectRepository(Periodo)
    private repo: Repository<Periodo>,
    @Inject(forwardRef(() => LancamentoService))
    private lancamentoService: LancamentoService,
    @Inject(forwardRef(() => BalanceteService))
    private balanceteService: BalanceteService,
  ) {}

  async findByNucleo(
    nucleoId: string,
  ): Promise<(Periodo & { pendencias: number })[]> {
    const periodos = await this.repo.find({
      where: { nucleoId },
      order: { ano: 'DESC', mes: 'DESC' },
    });

    const result = await Promise.all(
      periodos.map(async (p) => {
        let pendencias = 0;
        if (p.status === PeriodoStatus.ABERTO) {
          pendencias = await this.lancamentoService.countRascunhos(
            nucleoId,
            p.mes,
            p.ano,
          );
        }
        return { ...p, pendencias };
      }),
    );

    return result;
  }

  async findOne(
    mes: number,
    ano: number,
    nucleoId: string,
  ): Promise<Periodo | null> {
    const periodo = await this.repo.findOne({
      where: { mes, ano, nucleoId },
    });
    return periodo;
  }

  async abrir(
    mes: number,
    ano: number,
    nucleoId: string,
    userId: string,
  ): Promise<Periodo> {
    let periodo = await this.findOne(mes, ano, nucleoId);
    if (periodo) {
      if (periodo.status === PeriodoStatus.FECHADO) {
        throw new BadRequestException(
          'Período já existe e está FECHADO. Use a função de reabrir.',
        );
      }
      // If period exists and is open, ensure Balancete also exists (idempotency)
      await this.balanceteService.findOrCreate(nucleoId, mes, ano, userId);
      return periodo;
    }

    periodo = this.repo.create({
      mes,
      ano,
      nucleoId,
      status: PeriodoStatus.ABERTO,
    });

    const saved = await this.repo.save(periodo);
    // Auto-create Balancete
    await this.balanceteService.findOrCreate(nucleoId, mes, ano, userId);

    return saved;
  }

  async fechar(mes: number, ano: number, nucleoId: string): Promise<Periodo> {
    const periodo = await this.findOne(mes, ano, nucleoId);
    if (!periodo) {
      throw new NotFoundException(
        'Período não encontrado. É necessário abri-lo antes.',
      );
    }
    if (periodo.status === PeriodoStatus.FECHADO) {
      return periodo;
    }

    // Check for drafts
    const lancamentos = await this.lancamentoService.findAllByMesAno(
      nucleoId,
      mes,
      ano,
    );
    const hasDrafts = lancamentos.some((l) => l.status === 'RASCUNHO');

    if (hasDrafts) {
      throw new BadRequestException(
        'Não é possível fechar o período pois existem lançamentos em RASCUNHO.',
      );
    }

    periodo.status = PeriodoStatus.FECHADO;
    periodo.data_fechamento = new Date();
    return this.repo.save(periodo);
  }

  async reabrir(
    id: string,
    usuarioId: string,
    justificativa: string,
  ): Promise<Periodo> {
    const periodo = await this.repo.findOne({ where: { id } });
    if (!periodo) throw new NotFoundException('Período não encontrado');

    if (periodo.status === PeriodoStatus.ABERTO) {
      return periodo;
    }

    const log: ReaberturaLog = {
      data: new Date(),
      usuarioId,
      justificativa,
    };

    periodo.status = PeriodoStatus.ABERTO;
    periodo.reaberturas = [...(periodo.reaberturas || []), log];
    return this.repo.save(periodo);
  }

  async checkPermissao(
    dataMovimento: Date | string,
    nucleoId: string,
  ): Promise<void> {
    const date = new Date(dataMovimento);
    const mes = date.getMonth() + 1; // 0-11 to 1-12
    const ano = date.getFullYear();

    const periodo = await this.findOne(mes, ano, nucleoId);

    // If period doesn't exist, we assume it's LOCKED/CLOSED implicitly?
    // User requirement: "Abrir o período no sistema ... para que o sistema permita que eu realize lançamentos".
    // So if it doesn't exist, it is disallowed.
    if (!periodo) {
      throw new BadRequestException(
        `O período de ${mes}/${ano} não está aberto. Por favor, abra o período antes de realizar lançamentos.`,
      );
    }

    if (periodo.status === PeriodoStatus.FECHADO) {
      throw new BadRequestException(
        `O período de ${mes}/${ano} está FECHADO. Não é permitida nenhuma movimentação.`,
      );
    }
  }
}
