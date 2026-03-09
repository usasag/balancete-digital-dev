import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { BalanceteMensal, BalanceteStatus } from './balancete.entity';
import { BalanceteAprovacao } from './balancete-aprovacao.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../common/enums/role.enum';

import { LancamentoFinanceiro } from '../lancamento/lancamento.entity';
import dayjs from 'dayjs';
import { CreateBalanceteDto } from './dto/create-balancete.dto';

@Injectable()
export class BalanceteService {
  constructor(
    @InjectRepository(BalanceteMensal)
    private balanceteRepository: Repository<BalanceteMensal>,
    @InjectRepository(BalanceteAprovacao)
    private aprovacaoRepository: Repository<BalanceteAprovacao>,
    @InjectRepository(LancamentoFinanceiro)
    private lancamentoRepository: Repository<LancamentoFinanceiro>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async create(
    createDto: CreateBalanceteDto,
    user: Usuario,
  ): Promise<BalanceteMensal> {
    const balancete = this.balanceteRepository.create({
      ...createDto,
      nucleoId: user.nucleoId,
      criadoPor: user,
      status: BalanceteStatus.RASCUNHO,
    } as DeepPartial<BalanceteMensal>);
    return this.balanceteRepository.save(balancete);
  }

  async findOrCreate(
    nucleoId: string,
    mes: number,
    ano: number,
    userIdOrUid: string,
  ): Promise<BalanceteMensal> {
    const d = dayjs(new Date(ano, mes - 1, 1));
    const ano_mes = d.format('YYYY-MM');

    // Check if exists
    let balancete = await this.balanceteRepository.findOne({
      where: { nucleoId, ano_mes },
    });
    if (balancete) return balancete;

    // Resolve User
    let criador = await this.usuarioRepository.findOne({
      where: { id: userIdOrUid },
    });
    if (!criador) {
      criador = await this.usuarioRepository.findOne({
        where: { firebaseUid: userIdOrUid },
      });
    }
    if (!criador) throw new NotFoundException('Usuário não encontrado');

    // Find Previous Balancete for Saldo Inicial
    const prevDate = d.subtract(1, 'month');
    const prevAnoMes = prevDate.format('YYYY-MM');
    const prevBalancete = await this.balanceteRepository.findOne({
      where: { nucleoId, ano_mes: prevAnoMes },
    });
    const saldoInicial = prevBalancete ? Number(prevBalancete.saldo_final) : 0;

    balancete = this.balanceteRepository.create({
      nucleoId,
      ano_mes,
      saldo_inicial: saldoInicial,
      saldo_final: saldoInicial, // No transactions yet
      total_receitas: 0,
      total_despesas: 0,
      criadoPor: criador,
      criadoPorId: criador.id,
      status: BalanceteStatus.RASCUNHO,
    });

    const savedBalancete = await this.balanceteRepository.save(balancete);

    // Force update totals to include any existing transactions (e.g. Mensalidades)
    await this.updateTotals(nucleoId, d.toDate());

    const finalBalancete = await this.balanceteRepository.findOne({
      where: { id: savedBalancete.id },
    });

    if (!finalBalancete) {
      throw new NotFoundException(
        'Erro ao criar balancete: não encontrado após salvar.',
      );
    }

    return finalBalancete;
  }

  async findAll(nucleoId: string): Promise<BalanceteMensal[]> {
    return this.balanceteRepository.find({
      where: { nucleoId },
      order: { ano_mes: 'DESC' },
    });
  }

  async findOne(
    id: string,
  ): Promise<BalanceteMensal & { lancamentos: LancamentoFinanceiro[] }> {
    const balancete = await this.balanceteRepository.findOne({
      where: { id },
      relations: ['aprovacoes', 'aprovacoes.usuario'],
    });
    if (!balancete) throw new NotFoundException('Balancete não encontrado');

    // Fetch related lancamentos implicitly by Month/Year and Nucleo
    const [year, month] = balancete.ano_mes.split('-').map(Number);
    const startDate = dayjs(new Date(year, month - 1, 1))
      .startOf('month')
      .toDate();
    const endDate = dayjs(new Date(year, month - 1, 1))
      .endOf('month')
      .toDate();

    const lancamentos = await this.lancamentoRepository
      .createQueryBuilder('l')
      .where('l.nucleo_id = :nucleoId', { nucleoId: balancete.nucleoId })
      .andWhere('l.data_movimento >= :startDate', { startDate })
      .andWhere('l.data_movimento <= :endDate', { endDate })
      .orderBy('l.data_movimento', 'ASC')
      .getMany();

    return { ...balancete, lancamentos };
  }

  async approve(
    id: string,
    user: Usuario,
    status: 'APROVADO' | 'REPROVADO',
    ressalva?: string,
  ): Promise<BalanceteMensal> {
    console.error('DEBUG: Approve Start', id, user.role);
    const balancete = await this.findOne(id);

    // Validar se pode aprovar
    if (balancete.status === BalanceteStatus.PUBLICADO) {
      throw new BadRequestException(
        'Balancete já publicado não pode ser alterado.',
      );
    }

    const aprovacao = this.aprovacaoRepository.create({
      balancete,
      nucleo: user.nucleo,
      usuario: user,
      role_aprovador: user.role,
      cargo_aprovador: user.cargo,
      status,
      ressalva,
    } as DeepPartial<BalanceteAprovacao>);

    const saved = await this.aprovacaoRepository.save(aprovacao);
    console.error('DEBUG: Aprovacao Saved', saved.id, saved.role_aprovador);

    // Lógica da State Machine
    const allApprovals = await this.aprovacaoRepository.find({
      where: { balanceteId: id },
    });

    const tesourariaApproved = allApprovals.some(
      (a) =>
        (a.role_aprovador === Role.TESOURARIA ||
          a.role_aprovador === Role.PRESIDENCIA) &&
        a.status === 'APROVADO',
    );

    const conselhoApproved = allApprovals.some(
      (a) =>
        (a.role_aprovador === Role.CONSELHO_FISCAL ||
          a.role_aprovador === Role.PRESIDENCIA) &&
        a.status === 'APROVADO',
    );

    if (tesourariaApproved && conselhoApproved) {
      console.error('DEBUG: TRANSITIONING TO APROVADO');
      await this.balanceteRepository.update(id, {
        status: BalanceteStatus.APROVADO,
      });
      balancete.status = BalanceteStatus.APROVADO;
    } else if (
      balancete.status === BalanceteStatus.RASCUNHO &&
      (tesourariaApproved || conselhoApproved)
    ) {
      console.error('DEBUG: TRANSITIONING TO EM_APROVACAO');
      await this.balanceteRepository.update(id, {
        status: BalanceteStatus.EM_APROVACAO,
      });
      balancete.status = BalanceteStatus.EM_APROVACAO;
    }

    return balancete;
  }

  async updateTotals(nucleoId: string, date: Date | string): Promise<void> {
    const d = dayjs(date);
    const ano_mes = d.format('YYYY-MM');

    const balancete = await this.balanceteRepository.findOne({
      where: { nucleoId, ano_mes },
    });

    if (!balancete) {
      console.log(`No balancete found for ${ano_mes} to update.`);
      return;
    }

    if (balancete.status === BalanceteStatus.PUBLICADO) {
      console.warn(
        `Cannot update totals for published balancete: ${balancete.id}`,
      );
      return;
    }

    const startOfMonth = d.startOf('month').toDate();
    const endOfMonth = d.endOf('month').toDate();

    const resultReceita = await this.lancamentoRepository
      .createQueryBuilder('l')
      .select('SUM(l.valor)', 'receitaTotal')
      .where('l.nucleo_id = :nucleoId', { nucleoId })
      .andWhere('l.tipo = :tipo', { tipo: 'RECEITA' })
      .andWhere('l.data_movimento >= :start', { start: startOfMonth })
      .andWhere('l.data_movimento <= :end', { end: endOfMonth })
      .getRawOne<{ receitaTotal: string | null }>();

    const resultDespesa = await this.lancamentoRepository
      .createQueryBuilder('l')
      .select('SUM(l.valor)', 'despesaTotal')
      .where('l.nucleo_id = :nucleoId', { nucleoId })
      .andWhere('l.tipo = :tipo', { tipo: 'DESPESA' })
      .andWhere('l.data_movimento >= :start', { start: startOfMonth })
      .andWhere('l.data_movimento <= :end', { end: endOfMonth })
      .getRawOne<{ despesaTotal: string | null }>();

    const total_receitas = parseFloat(resultReceita?.receitaTotal || '0');
    const total_despesas = parseFloat(resultDespesa?.despesaTotal || '0');
    const saldo_final =
      (Number(balancete.saldo_inicial) || 0) + total_receitas - total_despesas;

    await this.balanceteRepository.update(balancete.id, {
      total_receitas,
      total_despesas,
      saldo_final,
    });

    console.log(
      `Updated Balancete ${ano_mes}: Receitas=${total_receitas}, Despesas=${total_despesas}, Final=${saldo_final}`,
    );

    // RECURSION: Update Next Month's Initial Balance
    const nextDate = d.add(1, 'month');
    const nextAnoMes = nextDate.format('YYYY-MM');
    const nextBalancete = await this.balanceteRepository.findOne({
      where: { nucleoId, ano_mes: nextAnoMes },
    });

    if (nextBalancete) {
      if (nextBalancete.status === BalanceteStatus.PUBLICADO) {
        console.warn('Next balancete is published, stopping recursion.');
        return;
      }
      console.log(`Propagating balance to next month: ${nextAnoMes}`);
      await this.balanceteRepository.update(nextBalancete.id, {
        saldo_inicial: saldo_final,
      });
      // Recursive call to calculate next month's final balance
      await this.updateTotals(nucleoId, nextDate.toDate());
    }
  }
}
