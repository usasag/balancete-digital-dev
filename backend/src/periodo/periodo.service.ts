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
import { MensalidadeService } from '../mensalidade/mensalidade.service';

@Injectable()
export class PeriodoService {
  constructor(
    @InjectRepository(Periodo)
    private repo: Repository<Periodo>,
    @Inject(forwardRef(() => LancamentoService))
    private lancamentoService: LancamentoService,
    @Inject(forwardRef(() => BalanceteService))
    private balanceteService: BalanceteService,
    @Inject(forwardRef(() => MensalidadeService))
    private mensalidadeService: MensalidadeService,
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
          const [rascunhos, mensalidadesPendentes] = await Promise.all([
            this.lancamentoService.countRascunhos(nucleoId, p.mes, p.ano),
            this.mensalidadeService.countPendenciasByReferencia(
              nucleoId,
              p.mes,
              p.ano,
            ),
          ]);
          pendencias = rascunhos + mensalidadesPendentes;
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

  async findById(id: string): Promise<Periodo> {
    const periodo = await this.repo.findOne({ where: { id } });
    if (!periodo) throw new NotFoundException('Período não encontrado');
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

    const [rascunhos, mensalidadesPendentes] = await Promise.all([
      this.lancamentoService.countRascunhos(nucleoId, mes, ano),
      this.mensalidadeService.countPendenciasByReferencia(nucleoId, mes, ano),
    ]);

    if (rascunhos > 0) {
      throw new BadRequestException(
        'Não é possível fechar o período pois existem lançamentos em RASCUNHO.',
      );
    }

    if (mensalidadesPendentes > 0) {
      throw new BadRequestException(
        'Não é possível fechar o período pois existem mensalidades pendentes no mês de referência.',
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
    const periodo = await this.findById(id);

    if (periodo.status === PeriodoStatus.ABERTO) {
      return periodo;
    }

    const justificativaNormalizada = justificativa?.trim() || '';
    if (justificativaNormalizada.length < 10) {
      throw new BadRequestException(
        'Justificativa obrigatória com no mínimo 10 caracteres para reabertura.',
      );
    }

    const log: ReaberturaLog = {
      data: new Date(),
      usuarioId,
      justificativa: justificativaNormalizada,
    };

    periodo.status = PeriodoStatus.ABERTO;
    periodo.reaberturas = [...(periodo.reaberturas || []), log];
    return this.repo.save(periodo);
  }

  async getChecklist(mes: number, ano: number, nucleoId: string) {
    const [lancamentosRascunho, mensalidadesPendentes] = await Promise.all([
      this.lancamentoService.countRascunhos(nucleoId, mes, ano),
      this.mensalidadeService.countPendenciasByReferencia(nucleoId, mes, ano),
    ]);

    const totalPendenciasCriticas = lancamentosRascunho + mensalidadesPendentes;
    return {
      lancamentosRascunho,
      mensalidadesPendentes,
      totalPendenciasCriticas,
      bloqueiaFechamento: totalPendenciasCriticas > 0,
    };
  }

  async getAlertas(nucleoId: string) {
    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();

    const [checklistAtual, periodos, inadimplencia] = await Promise.all([
      this.getChecklist(mesAtual, anoAtual, nucleoId),
      this.findByNucleo(nucleoId),
      this.mensalidadeService.getInadimplenciaReport(nucleoId),
    ]);

    const alertas: Array<{
      code: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
    }> = [];

    if (checklistAtual.lancamentosRascunho > 0) {
      alertas.push({
        code: 'LANCAMENTOS_RASCUNHO',
        severity: 'warning',
        title: 'Lançamentos em rascunho',
        message: `${checklistAtual.lancamentosRascunho} lançamento(s) em rascunho no mês atual.`,
      });
    }

    if (checklistAtual.mensalidadesPendentes > 0) {
      alertas.push({
        code: 'MENSALIDADES_PENDENTES',
        severity: 'warning',
        title: 'Mensalidades pendentes',
        message: `${checklistAtual.mensalidadesPendentes} mensalidade(s) pendente(s) no mês de referência atual.`,
      });
    }

    const periodoAnterior = periodos.find(
      (p) =>
        (mesAtual === 1
          ? p.mes === 12 && p.ano === anoAtual - 1
          : p.mes === mesAtual - 1 && p.ano === anoAtual),
    );
    if (periodoAnterior && periodoAnterior.status !== PeriodoStatus.FECHADO) {
      alertas.push({
        code: 'PERIODO_ANTERIOR_ABERTO',
        severity: 'critical',
        title: 'Período anterior ainda aberto',
        message: `O período ${String(periodoAnterior.mes).padStart(2, '0')}/${periodoAnterior.ano} ainda não foi fechado.`,
      });
    }

    if (inadimplencia.length > 0) {
      const totalDevido = inadimplencia.reduce(
        (acc, item) => acc + Number(item.total_devido || 0),
        0,
      );
      alertas.push({
        code: 'INADIMPLENCIA_ATIVA',
        severity: 'info',
        title: 'Inadimplência ativa',
        message: `${inadimplencia.length} sócio(s) com atraso. Total devido: R$ ${totalDevido.toFixed(2)}.`,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      total: alertas.length,
      alertas,
    };
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
