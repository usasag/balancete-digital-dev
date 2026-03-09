import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaFinanceira } from './categoria-financeira.entity';

@Injectable()
export class CategoriaFinanceiraService {
  constructor(
    @InjectRepository(CategoriaFinanceira)
    private repo: Repository<CategoriaFinanceira>,
  ) {}

  create(createDto: Partial<CategoriaFinanceira>) {
    const cat = this.repo.create(createDto);
    return this.repo.save(cat);
  }

  findAll(nucleoId: string) {
    return this.repo.find({
      where: { nucleoId },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string) {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async update(id: string, updateDto: Partial<CategoriaFinanceira>) {
    await this.findOne(id);
    return this.repo.update(id, updateDto);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return result;
  }
}
