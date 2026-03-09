import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Mensalidade } from './mensalidade.entity';
import { Usuario } from '../usuario/usuario.entity';
import { LancamentoService } from '../lancamento/lancamento.service';
import { Taxa } from '../taxa/taxa.entity';
import { UsuarioService } from '../usuario/usuario.service';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { UsuarioTaxaService } from '../usuario-taxa/usuario-taxa.service';
import dayjs from 'dayjs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class MensalidadeService {
  constructor(
    @InjectRepository(Mensalidade)
    private repo: Repository<Mensalidade>,
    @InjectRepository(Taxa)
    private taxaRepo: Repository<Taxa>,
    @Inject(forwardRef(() => LancamentoService))
    private lancamentoService: LancamentoService,
    private userService: UsuarioService,
    private configService: ConfiguracaoService,
    private usuarioTaxaService: UsuarioTaxaService,
  ) {}

  async create(data: DeepPartial<Mensalidade>): Promise<Mensalidade> {
    // 1. Ensure Nucleo ID is available to fetch config
    const nucleoId = data.nucleoId || (data.nucleo as Usuario['nucleo'])?.id;

    if (nucleoId) {
      const config = await this.configService.findOneByNucleo(String(nucleoId));

      // 2. Initialize items if undefined
      if (!data.itens) {
        data.itens = [];
      }

      // 3. Check for mandatory items and add if missing
      // We check by strict name for now, or we could add a "type" field later.
      const hasDG = data.itens.some(
        (i) => i.nome === 'Repasse Diretoria Geral',
      );
      const hasRegiao = data.itens.some((i) => i.nome === 'Repasse 11ª Região');

      if (!hasDG && Number(config.valor_repasse_dg) > 0) {
        data.itens.push({
          nome: 'Repasse Diretoria Geral',
          valor: Number(config.valor_repasse_dg),
          obrigatorio: true,
          selecionado: true,
          caixaId: config.caixaDgId,
        });
      }

      if (!hasRegiao && Number(config.valor_repasse_regiao) > 0) {
        data.itens.push({
          nome: 'Repasse 11ª Região',
          valor: Number(config.valor_repasse_regiao),
          obrigatorio: true,
          selecionado: true,
          caixaId: config.caixaRegiaoId,
        });
      }
    }

    const mensalidade = this.repo.create(data);
    this.calculateTotal(mensalidade);

    // Determine due date: 10th of the reference month/year
    // Assuming mes_referencia is 'MM/YYYY'
    if (mensalidade.mes_referencia) {
      const [month, year] = mensalidade.mes_referencia.split('/').map(Number);
      const dueDate = dayjs(new Date(year, month - 1, 10));
      mensalidade.data_vencimento = dueDate.format('YYYY-MM-DD');
    }
    mensalidade.status = 'PENDENTE';
    return this.repo.save(mensalidade);
  }

  private calculateTotal(mensalidade: Mensalidade) {
    let total = Number(mensalidade.valor_base) || 0;

    // Sum selected items
    if (mensalidade.itens) {
      mensalidade.itens.forEach((item) => {
        if (item.selecionado || item.obrigatorio) {
          total += Number(item.valor);
        }
      });
    }

    // Sum taxa extra installments
    if (mensalidade.taxa_extra) {
      mensalidade.taxa_extra.forEach((taxa) => {
        total += Number(taxa.valor_parcela);
      });
    }

    mensalidade.valor_total = total;
  }

  async addTaxa(mensalidadeId: string, taxaId: string): Promise<Mensalidade> {
    const mensalidade = await this.findOne(mensalidadeId);
    const taxa = await this.taxaRepo.findOne({ where: { id: taxaId } });

    if (!taxa) throw new NotFoundException('Taxa não encontrada');

    if (!mensalidade.taxa_extra) {
      mensalidade.taxa_extra = [];
    }

    // Check if already applied? Maybe allow multiples? Let's check ID or name to prevent duplicates if needed.
    // Ideally we track by Taxa ID but we are storing a snapshot. Let's assume name uniqueness for now or allow duplicates.
    // Actually, let's treat it as a new entry.

    mensalidade.taxa_extra.push({
      descricao: taxa.nome,
      valor_total: Number(taxa.valor),
      parcela_atual: 1, // Default to 1st installment or full
      total_parcelas: taxa.parcelado ? taxa.total_parcelas : 1,
      valor_parcela: taxa.parcelado
        ? Number(taxa.valor) / taxa.total_parcelas
        : Number(taxa.valor),
      caixaId: taxa.caixaId,
    });

    this.calculateTotal(mensalidade);
    return this.repo.save(mensalidade);
  }

  async removeTaxa(
    mensalidadeId: string,
    taxaIndex: number,
  ): Promise<Mensalidade> {
    const mensalidade = await this.findOne(mensalidadeId);

    if (mensalidade.taxa_extra && mensalidade.taxa_extra[taxaIndex]) {
      mensalidade.taxa_extra.splice(taxaIndex, 1);
      this.calculateTotal(mensalidade);
      return this.repo.save(mensalidade);
    }

    return mensalidade;
  }

  generateForYear(year: number, nucleoId: string, baseValue: number) {
    console.log(
      `Generating mensalidades for ${year} in nucleo ${nucleoId} with base ${baseValue}`,
    );
  }

  // Check and update status based on rules
  private async checkStatus(mensalidade: Mensalidade) {
    if (
      mensalidade.status === 'PAGO' ||
      mensalidade.status === 'EM ACORDO' ||
      mensalidade.status.includes('SOCIAL')
    ) {
      return; // Manual statuses or final statuses don't automatically change
    }

    if (!mensalidade.data_vencimento) return;

    const today = dayjs();
    const dueDate = dayjs(mensalidade.data_vencimento);

    // If past due date (11th onwards)
    if (today.isAfter(dueDate, 'day')) {
      // Check if 30 days past (Next month 11th approx)
      // Rule: "Day 11 of next month" -> effective if > 30 days or specifically updated date logic
      // Let's use simple logic: > 30 days late = INADIMPLENTE, else ATRASADO
      if (today.diff(dueDate, 'day') > 30) {
        if (mensalidade.status !== 'INADIMPLENTE') {
          mensalidade.status = 'INADIMPLENTE';
          await this.repo.save(mensalidade);
        }
      } else {
        if (mensalidade.status !== 'ATRASADO') {
          mensalidade.status = 'ATRASADO';
          await this.repo.save(mensalidade);
        }
      }
    }
  }

  async findAllByNucleo(nucleoId: string): Promise<Mensalidade[]> {
    const mensalidades = await this.repo.find({
      where: { nucleo: { id: nucleoId } },
      relations: ['socio'],
      order: { mes_referencia: 'DESC' },
    });

    // Check statuses
    for (const m of mensalidades) {
      await this.checkStatus(m);
    }

    return mensalidades;
  }

  async findAllBySocio(socioId: string): Promise<Mensalidade[]> {
    const mensalidades = await this.repo.find({
      where: { socio: { id: socioId } },
      order: { mes_referencia: 'DESC' },
    });

    // Check statuses
    for (const m of mensalidades) {
      await this.checkStatus(m);
    }

    return mensalidades;
  }

  async findOne(id: string): Promise<Mensalidade> {
    const mensalidade = await this.repo.findOne({
      where: { id },
      relations: ['socio', 'nucleo'],
    });
    if (!mensalidade) throw new NotFoundException('Mensalidade não encontrada');

    await this.checkStatus(mensalidade);

    return mensalidade;
  }

  async update(
    id: string,
    data: DeepPartial<Mensalidade>,
  ): Promise<Mensalidade> {
    const existing = await this.findOne(id);
    const updated = this.repo.merge(existing, data);
    this.calculateTotal(updated);

    // If manually setting status to PAGO via update, trigger pay logic if needed?
    // Better to have explicit pay method, but for compatibility let's handle it here if changed.
    if (data.status === 'PAGO' && existing.status !== 'PAGO') {
      // Ideally call pay() logic, but let's keep simple update for now
      // This is mainly for admin edits
      updated.data_pagamento = new Date();
    }

    await this.repo.save(updated);
    return this.findOne(id);
  }

  async registerAgreement(
    id: string,
    agreementDate: Date,
  ): Promise<Mensalidade> {
    const mensalidade = await this.findOne(id);
    mensalidade.status = 'EM ACORDO';
    mensalidade.data_acordo = agreementDate;
    return this.repo.save(mensalidade);
  }

  async pay(id: string, paymentDate?: Date): Promise<Mensalidade> {
    const mensalidade = await this.findOne(id);
    if (mensalidade.status === 'PAGO') return mensalidade;

    mensalidade.status = 'PAGO';
    mensalidade.data_pagamento = paymentDate || new Date();
    await this.repo.save(mensalidade);

    const config = await this.configService.findOneByNucleo(
      mensalidade.nucleoId,
    );
    const date = paymentDate || new Date(); // Payment date

    // 1. Mensalidade Base
    if (Number(mensalidade.valor_base) > 0) {
      await this.lancamentoService.create({
        nucleo: mensalidade.nucleo,
        nucleoId: mensalidade.nucleoId,
        caixaId: config.caixaNucleoId,
        data_movimento: date,
        descricao: `Mensalidade ${mensalidade.mes_referencia} - ${
          mensalidade.socio?.nomeCompleto || 'Sócio'
        }`,
        valor: Number(mensalidade.valor_base),
        tipo: 'RECEITA',
        categoria: 'MENSALIDADE',
        subcategoria: 'Mensalidade Líquida',
        observacao: `Mensalidade Base - ${mensalidade.mes_referencia}`,
        criadoPor: mensalidade.socio,
      });
    }

    // 2. Items (Repasses)
    if (mensalidade.itens) {
      for (const item of mensalidade.itens) {
        if (item.selecionado) {
          await this.lancamentoService.create({
            nucleo: mensalidade.nucleo,
            nucleoId: mensalidade.nucleoId,
            caixaId: item.caixaId,
            data_movimento: date,
            descricao: `${item.nome} - ${
              mensalidade.socio?.nomeCompleto || 'Sócio'
            }`,
            valor: Number(item.valor),
            tipo: 'RECEITA',
            categoria: 'MENSALIDADE',
            subcategoria: item.nome, // E.g., 'Repasse Diretoria Geral'
            observacao: `Ref. ${mensalidade.mes_referencia}`,
            criadoPor: mensalidade.socio,
          });
        }
      }
    }

    // 3. Taxa Extra
    if (mensalidade.taxa_extra) {
      for (const taxa of mensalidade.taxa_extra) {
        await this.lancamentoService.create({
          nucleo: mensalidade.nucleo,
          nucleoId: mensalidade.nucleoId,
          caixaId: taxa.caixaId,
          data_movimento: date,
          descricao: `${taxa.descricao} (${taxa.parcela_atual}/${
            taxa.total_parcelas
          }) - ${mensalidade.socio?.nomeCompleto || 'Sócio'}`,
          valor: Number(taxa.valor_parcela),
          tipo: 'RECEITA',
          categoria: 'TAXA EXTRA',
          subcategoria: taxa.descricao,
          criadoPor: mensalidade.socio,
        });
      }
    }

    return mensalidade;
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Mensalidade não encontrada');
    }
  }
  // Automated generation: Run at 00:00 on the 1st of every month
  @Cron('0 0 1 * *')
  async generateMonthlyBills() {
    console.log('Starting automated mensalidade generation...');
    const now = dayjs();
    const mesReferencia = now.format('MM/YYYY');

    // 1. Get all active users
    const activeUsers = await this.userService.findAllActive(); // Need to ensure findAllActive exists or use find({ where: { ativo: true } })

    // 2. Get active configuration (assuming single nucleo context or iterate nucleos?
    // For now, assuming single nucleo or we need to iterate per user's nucleo.
    // Let's iterate users and fetch config per nucleo (optimization: cache configs)

    // Better optimization: Group users by nucleo
    const usersByNucleo = activeUsers.reduce(
      (acc: Record<string, Usuario[]>, user: Usuario) => {
        (acc[user.nucleoId] = acc[user.nucleoId] || []).push(user);
        return acc;
      },
      {} as Record<string, Usuario[]>,
    );

    for (const nucleoId in usersByNucleo) {
      const config = await this.configService.findOneByNucleo(nucleoId);
      const nucleoUsers = usersByNucleo[nucleoId];

      for (const user of nucleoUsers) {
        // Check if already exists for this month
        const existing = await this.repo.findOne({
          where: {
            socio: { id: user.id },
            mes_referencia: mesReferencia,
          },
        });

        if (existing) {
          console.log(
            `Mensalidade already exists for ${user.nomeCompleto} (${mesReferencia})`,
          );
          continue;
        }

        // Calculate values
        const valorBase = Number(user.valor_base) || 0;
        const repasseDG = Number(config.valor_repasse_dg) || 0;
        const repasseRegiao = Number(config.valor_repasse_regiao) || 0;

        const total = valorBase + repasseDG + repasseRegiao;

        // Fetch user taxes using the new module
        const activeTaxes = await this.usuarioTaxaService.findAllByUsuario(
          user.id,
        );
        const taxesToAdd = [];

        for (const userTax of activeTaxes) {
          if (!userTax.parcelas) continue;

          // Find installment matching the reference month
          const installment = userTax.parcelas.find((p) => {
            const dueDate = dayjs(p.vencimento);
            return dueDate.format('MM/YYYY') === mesReferencia;
          });

          if (installment) {
            taxesToAdd.push({
              descricao: userTax.taxa.nome,
              valor_total: Number(userTax.valor_total),
              parcela_atual: installment.numero,
              total_parcelas: userTax.num_parcelas,
              valor_parcela: Number(installment.valor),
              caixaId: userTax.taxa.caixaId,
            });
          }
        }

        const finalTotal =
          total + taxesToAdd.reduce((sum, t) => sum + t.valor_parcela, 0);

        // Create Mensalidade
        await this.create({
          socio: user,
          socioId: user.id,
          nucleo: user.nucleo, // Assuming loaded
          nucleoId: user.nucleoId,
          mes_referencia: mesReferencia,
          valor_base: valorBase,
          valor_total: finalTotal,
          status: 'PENDENTE',
          taxa_extra: taxesToAdd,
          itens: [
            {
              nome: 'Repasse Diretoria Geral',
              valor: repasseDG,
              obrigatorio: true,
              selecionado: true,
              caixaId: config.caixaDgId,
            },
            {
              nome: 'Repasse 11ª Região',
              valor: repasseRegiao,
              obrigatorio: true,
              selecionado: true,
              caixaId: config.caixaRegiaoId,
            },
          ],
        });
        console.log(`Generated mensalidade for ${user.nomeCompleto}: ${total}`);
      }
    }
    console.log('Automated generation completed.');
  }

  // Admin manual trigger
  async generateNow() {
    return this.generateMonthlyBills();
  }

  async getInadimplenciaReport(
    nucleoId: string,
  ): Promise<InadimplenciaReportItem[]> {
    // 1. Find all unpaid mensalidades past due date
    const today = dayjs().format('YYYY-MM-DD');
    const inadimplentes = await this.repo
      .createQueryBuilder('mensalidade')
      .leftJoinAndSelect('mensalidade.socio', 'socio')
      .where('mensalidade.nucleo_id = :nucleoId', { nucleoId })
      .andWhere('mensalidade.status IN (:...statuses)', {
        statuses: ['PENDENTE', 'ATRASADO', 'INADIMPLENTE'],
      })
      .andWhere('mensalidade.data_vencimento < :today', { today })
      .orderBy('mensalidade.data_vencimento', 'ASC')
      .getMany();

    // 2. Group by User
    const report = inadimplentes.reduce(
      (acc: Record<string, InadimplenciaReportItem>, curr) => {
        const socioId = curr.socioId;
        if (!acc[socioId]) {
          acc[socioId] = {
            socio: curr.socio,
            total_devido: 0,
            meses_atraso: 0,
            mensalidades: [],
          };
        }
        acc[socioId].total_devido += Number(curr.valor_total);
        acc[socioId].meses_atraso += 1;
        acc[socioId].mensalidades.push({
          id: curr.id,
          mes_referencia: curr.mes_referencia,
          valor: curr.valor_total,
          vencimento: curr.data_vencimento,
          status: curr.status,
        });
        return acc;
      },
      {} as Record<string, InadimplenciaReportItem>,
    );

    // 3. Convert to array and sort by debt
    return Object.values(report).sort(
      (a, b) => b.total_devido - a.total_devido,
    );
  }
}

export interface InadimplenciaReportItem {
  socio: Usuario;
  total_devido: number;
  meses_atraso: number;
  mensalidades: Array<{
    id: string;
    mes_referencia: string;
    valor: number;
    vencimento: string;
    status: string;
  }>;
}
