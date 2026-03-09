import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Periodo } from './periodo.entity';
import { PeriodoService } from './periodo.service';
import { PeriodoController } from './periodo.controller';
import { LancamentoModule } from '../lancamento/lancamento.module';
import { BalanceteModule } from '../balancete/balancete.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Periodo]),
    forwardRef(() => LancamentoModule),
    forwardRef(() => BalanceteModule),
  ],
  controllers: [PeriodoController],
  providers: [PeriodoService],
  exports: [PeriodoService],
})
export class PeriodoModule {}
