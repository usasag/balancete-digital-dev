import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caixa } from './caixa.entity';
import { Nucleo } from '../nucleo/nucleo.entity';

@Injectable()
export class CaixaService {
  constructor(
    @InjectRepository(Caixa)
    private caixaRepository: Repository<Caixa>,
    @InjectRepository(Nucleo)
    private nucleoRepository: Repository<Nucleo>,
  ) {}

  async findAllByNucleo(nucleoId: string): Promise<Caixa[]> {
    return this.caixaRepository.find({
      where: { nucleoId, ativo: true },
      order: { nome: 'ASC' },
    });
  }

  async create(data: Partial<Caixa>): Promise<Caixa> {
    this.validateDistribution(data);
    const caixa = this.caixaRepository.create(data);
    return this.caixaRepository.save(caixa);
  }

  private validateDistribution(data: Partial<Caixa>) {
    if (
      data.ativo !== false &&
      data.saldoInicial !== undefined &&
      data.distribuicaoInicial
    ) {
      const { dinheiro, contas, outros } = data.distribuicaoInicial;
      const totalContas = Object.values(contas || {}).reduce(
        (acc, val) => acc + (Number(val) || 0),
        0,
      );
      const totalDist =
        (Number(dinheiro) || 0) + totalContas + (Number(outros) || 0);

      const diff = Math.abs(Number(data.saldoInicial) - totalDist);
      if (diff > 0.01) {
        throw new Error(
          `A distribuição de fundos (R$ ${totalDist.toFixed(2)}) não corresponde ao Saldo Inicial (R$ ${Number(data.saldoInicial).toFixed(2)}).`,
        );
      }
    }
  }

  async findOne(id: string): Promise<Caixa | null> {
    return this.caixaRepository.findOne({
      where: { id },
    });
  }

  // Helper to find default caixa (usually Tesouraria)
  async findDefault(nucleoId: string): Promise<Caixa | null> {
    const tesouraria = await this.caixaRepository.findOne({
      where: { nucleoId, nome: 'Tesouraria' },
    });
    if (tesouraria) return tesouraria;

    // Fallback to any
    return this.caixaRepository.findOne({ where: { nucleoId } });
  }
  async update(id: string, data: Partial<Caixa>): Promise<Caixa> {
    if (data.saldoInicial !== undefined || data.distribuicaoInicial) {
      // Ideally we should fetch current if partial update, but assuming full payload or consistent pair for now.
      // If only one is sent, validation might be tricky without fetching first.
      // For simple CRUD, usually both are sent or we can fetch.
      // Let's rely on the fact that the frontend sends both if changed.
      this.validateDistribution(data);
    }
    await this.caixaRepository.update(id, data);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new Error('Caixa não encontrada'); // Simple error or NotFoundException if imported
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.caixaRepository.delete(id);
  }

  async seedDefaults(): Promise<string[]> {
    const nucleos = await this.nucleoRepository.find();
    const caixasToSeed = ['Fundo de bilhete aéreo', 'Plantio', 'Novo Encanto'];
    const results: string[] = [];

    for (const nucleo of nucleos) {
      const existingCaixas = await this.findAllByNucleo(nucleo.id);
      const existingNames = existingCaixas.map((c) => c.nome);

      for (const nome of caixasToSeed) {
        if (!existingNames.includes(nome)) {
          await this.create({
            nome,
            nucleoId: nucleo.id,
            saldoInicial: 0,
            ativo: true,
            nucleo: nucleo,
          });
          results.push(`Created '${nome}' for Nucleo ${nucleo.nome}`);
        }
      }
    }
    return results;
  }
}
