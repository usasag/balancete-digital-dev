import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Periodo } from './periodo.entity';
import { PeriodoService } from './periodo.service';
import { PeriodoController } from './periodo.controller';
import { LancamentoModule } from '../lancamento/lancamento.module';
import { BalanceteModule } from '../balancete/balancete.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';
import { MensalidadeModule } from '../mensalidade/mensalidade.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Periodo]),
    forwardRef(() => LancamentoModule),
    forwardRef(() => BalanceteModule),
    forwardRef(() => MensalidadeModule),
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [PeriodoController],
  providers: [PeriodoService],
  exports: [PeriodoService],
})
export class PeriodoModule {}
