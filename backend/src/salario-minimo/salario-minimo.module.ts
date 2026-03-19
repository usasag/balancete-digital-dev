import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalarioMinimoHistorico } from './salario-minimo.entity';
import { SalarioMinimoService } from './salario-minimo.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalarioMinimoHistorico])],
  providers: [SalarioMinimoService],
  exports: [SalarioMinimoService],
})
export class SalarioMinimoModule {}
