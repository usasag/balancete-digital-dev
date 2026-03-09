import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { ContaBancaria } from './conta-bancaria.entity';

@Injectable()
export class ContaBancariaService {
  constructor(
    @InjectRepository(ContaBancaria)
    private repo: Repository<ContaBancaria>,
  ) {}

  async create(data: DeepPartial<ContaBancaria>): Promise<ContaBancaria> {
    const conta = this.repo.create(data);
    return this.repo.save(conta);
  }

  async findAllByNucleo(nucleoId: string): Promise<ContaBancaria[]> {
    return this.repo.find({
      where: { nucleo: { id: nucleoId } },
      order: { nome_conta: 'ASC' },
      relations: ['nucleo'],
    });
  }

  async findOne(id: string): Promise<ContaBancaria> {
    const conta = await this.repo.findOne({
      where: { id },
      relations: ['nucleo'],
    });
    if (!conta) throw new NotFoundException('Conta bancária não encontrada');
    return conta;
  }

  async update(
    id: string,
    data: DeepPartial<ContaBancaria>,
  ): Promise<ContaBancaria> {
    const conta = await this.findOne(id);
    this.repo.merge(conta, data);
    return this.repo.save(conta);
  }

  async remove(id: string): Promise<void> {
    const conta = await this.findOne(id);
    // Logic to prevent deletion if linked to active Caixas could go here
    await this.repo.remove(conta);
  }
}
