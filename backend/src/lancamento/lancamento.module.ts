import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LancamentoFinanceiro } from './lancamento.entity';
import { LancamentoService } from './lancamento.service';
import { LancamentoController } from './lancamento.controller';
import { LancamentoImportLog } from './lancamento-import-log.entity';
import { LancamentoTemplate } from './lancamento-template.entity';

import { BalanceteModule } from '../balancete/balancete.module';

import { CaixaModule } from '../caixa/caixa.module';
import { PeriodoModule } from '../periodo/periodo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LancamentoFinanceiro,
      LancamentoImportLog,
      LancamentoTemplate,
    ]),
    BalanceteModule,
    forwardRef(() => CaixaModule),
    PeriodoModule,
  ],
  controllers: [LancamentoController],
  providers: [LancamentoService],
  exports: [LancamentoService],
})
export class LancamentoModule {}
