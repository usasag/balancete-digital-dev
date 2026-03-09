import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { ConfiguracaoFinanceira } from './configuracao.entity';

@Injectable()
export class ConfiguracaoService {
  constructor(
    @InjectRepository(ConfiguracaoFinanceira)
    private repo: Repository<ConfiguracaoFinanceira>,
  ) {}

  async findOneByNucleo(nucleoId: string): Promise<ConfiguracaoFinanceira> {
    let config = await this.repo.findOne({
      where: { nucleo: { id: nucleoId } },
    });
    if (!config) {
      // Auto-create default if missing
      config = this.repo.create({
        nucleoId,
        valor_repasse_dg: 24.57,
        valor_repasse_regiao: 12.0,
      });
      return this.repo.save(config);
    }
    return config;
  }

  async update(
    nucleoId: string,
    data: DeepPartial<ConfiguracaoFinanceira>,
  ): Promise<ConfiguracaoFinanceira> {
    const config = await this.findOneByNucleo(nucleoId);
    this.repo.merge(config, data);
    return this.repo.save(config);
  }
}
