import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaLog } from './auditoria-log.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaLog)
    private repo: Repository<AuditoriaLog>,
  ) {}

  async log(data: {
    entidade: 'LANCAMENTO' | 'MENSALIDADE' | 'PERIODO';
    entidadeId: string;
    acao: string;
    nucleoId: string;
    usuarioId?: string | null;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditoriaLog> {
    const entry = this.repo.create({
      entidade: data.entidade,
      entidadeId: data.entidadeId,
      acao: data.acao,
      nucleoId: data.nucleoId,
      usuarioId: data.usuarioId || null,
      beforeData: data.beforeData || null,
      afterData: data.afterData || null,
      metadata: data.metadata || null,
    });

    return this.repo.save(entry);
  }

  async findByNucleo(nucleoId: string): Promise<AuditoriaLog[]> {
    return this.repo.find({
      where: { nucleoId },
      relations: ['usuario'],
      order: { dataCriacao: 'DESC' },
      take: 200,
    });
  }
}
