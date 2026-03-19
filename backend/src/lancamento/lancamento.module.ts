import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LancamentoFinanceiro } from './lancamento.entity';
import { LancamentoService } from './lancamento.service';
import { LancamentoController } from './lancamento.controller';
import { LancamentoImportLog } from './lancamento-import-log.entity';
import { LancamentoTemplate } from './lancamento-template.entity';
import { EvidenciaMigracaoLog } from './evidencia-migracao-log.entity';
import { EvidenciaAuditoriaLog } from './evidencia-auditoria-log.entity';

import { BalanceteModule } from '../balancete/balancete.module';

import { CaixaModule } from '../caixa/caixa.module';
import { PeriodoModule } from '../periodo/periodo.module';
import { MensalidadeModule } from '../mensalidade/mensalidade.module';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { SalarioMinimoModule } from '../salario-minimo/salario-minimo.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LancamentoFinanceiro,
      LancamentoImportLog,
      LancamentoTemplate,
      EvidenciaMigracaoLog,
      EvidenciaAuditoriaLog,
    ]),
    BalanceteModule,
    forwardRef(() => CaixaModule),
    PeriodoModule,
    forwardRef(() => MensalidadeModule),
    ConfiguracaoModule,
    SalarioMinimoModule,
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [LancamentoController],
  providers: [LancamentoService],
  exports: [LancamentoService],
})
export class LancamentoModule {}
