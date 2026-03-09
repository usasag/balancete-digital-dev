import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioTaxa } from './usuario-taxa.entity';
import dayjs from 'dayjs';

interface AssignDto {
  usuarioIds: string[];
  taxaId: string;
  valorTotal: number;
  numParcelas: number;
  dataInicio: string; // YYYY-MM-DD
}

@Injectable()
export class UsuarioTaxaService {
  constructor(
    @InjectRepository(UsuarioTaxa)
    private repo: Repository<UsuarioTaxa>,
  ) {}

  async assign({
    usuarioIds,
    taxaId,
    valorTotal,
    numParcelas,
    dataInicio,
  }: AssignDto) {
    const valorParcela = valorTotal / numParcelas;
    const parcelas = Array.from({ length: numParcelas }).map((_, i) => ({
      numero: i + 1,
      valor: valorParcela,
      vencimento: dayjs(dataInicio).add(i, 'month').format('YYYY-MM-DD'),
      status: 'PENDENTE' as const,
    }));

    const entities = usuarioIds.map((uid) =>
      this.repo.create({
        usuarioId: uid,
        taxaId,
        valor_total: valorTotal,
        num_parcelas: numParcelas,
        data_inicio: dataInicio,
        parcelas,
        ativo: true,
      }),
    );

    return this.repo.save(entities);
  }

  async preview(dto: AssignDto) {
    const valorParcela = dto.valorTotal / dto.numParcelas;
    return Promise.resolve(
      Array.from({ length: dto.numParcelas }).map((_, i) => ({
        numero: i + 1,
        valor: valorParcela,
        vencimento: dayjs(dto.dataInicio).add(i, 'month').format('YYYY-MM-DD'),
      })),
    );
  }

  async findAllByUsuario(usuarioId: string) {
    return this.repo.find({
      where: { usuarioId, ativo: true },
      relations: ['taxa'],
    });
  }

  async findActiveByNucleo(nucleoId: string) {
    return this.repo.find({
      where: {
        usuario: { nucleoId },
        ativo: true,
      },
      relations: ['usuario', 'taxa'],
    });
  }
}
