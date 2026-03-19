import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalarioMinimoHistorico } from './salario-minimo.entity';

@Injectable()
export class SalarioMinimoService {
  constructor(
    @InjectRepository(SalarioMinimoHistorico)
    private repo: Repository<SalarioMinimoHistorico>,
  ) {}

  private async fetchValorFromApi(ano: number): Promise<number | null> {
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/taxas/v1/salario-minimo?ano=${ano}`,
      );
      if (!response.ok) return null;
      const data = (await response.json()) as { valor?: number };
      if (!data?.valor || Number.isNaN(Number(data.valor))) return null;
      return Number(data.valor);
    } catch {
      return null;
    }
  }

  private fallbackByYear(ano: number): number {
    if (ano >= 2025) return 1518;
    if (ano >= 2024) return 1412;
    if (ano >= 2023) return 1320;
    if (ano >= 2022) return 1212;
    if (ano >= 2021) return 1100;
    return 1045;
  }

  async getByDate(date: Date): Promise<number> {
    const ano = date.getFullYear();
    const existing = await this.repo.findOne({ where: { ano } });
    if (existing) return Number(existing.valor);

    const fromApi = await this.fetchValorFromApi(ano);
    const valor = fromApi ?? this.fallbackByYear(ano);
    const saved = this.repo.create({
      ano,
      valor,
      fonte: fromApi ? 'BRASIL_API' : 'FALLBACK',
    });
    await this.repo.save(saved);
    return valor;
  }
}
