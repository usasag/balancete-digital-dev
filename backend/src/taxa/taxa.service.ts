import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Taxa } from './taxa.entity';

@Injectable()
export class TaxaService {
  constructor(
    @InjectRepository(Taxa)
    private repo: Repository<Taxa>,
  ) {}

  async create(data: DeepPartial<Taxa>): Promise<Taxa> {
    const taxa = this.repo.create(data);
    return this.repo.save(taxa);
  }

  async findAllByNucleo(nucleoId: string): Promise<Taxa[]> {
    return this.repo.find({
      where: { nucleo: { id: nucleoId } },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Taxa> {
    const taxa = await this.repo.findOne({ where: { id } });
    if (!taxa) throw new NotFoundException('Taxa não encontrada');
    return taxa;
  }

  async update(id: string, data: DeepPartial<Taxa>): Promise<Taxa> {
    const taxa = await this.findOne(id);
    this.repo.merge(taxa, data);
    return this.repo.save(taxa);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
