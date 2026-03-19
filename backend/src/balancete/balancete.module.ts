import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceteMensal } from './balancete.entity';
import { BalanceteAprovacao } from './balancete-aprovacao.entity';
import { LancamentoFinanceiro } from '../lancamento/lancamento.entity';
import { Usuario } from '../usuario/usuario.entity';
import { BalanceteService } from './balancete.service';
import { BalanceteController } from './balancete.controller';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BalanceteMensal,
      BalanceteAprovacao,
      LancamentoFinanceiro,
      Usuario,
    ]),
    ConfiguracaoModule,
  ],
  controllers: [BalanceteController],
  providers: [BalanceteService],
  exports: [BalanceteService],
})
export class BalanceteModule {}
