import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { BalanceteModule } from './balancete/balancete.module';
import { NucleoModule } from './nucleo/nucleo.module';
import { LancamentoModule } from './lancamento/lancamento.module';
import { MensalidadeModule } from './mensalidade/mensalidade.module';
import { TaxaModule } from './taxa/taxa.module';
import { ConfiguracaoModule } from './configuracao/configuracao.module';
import { CaixaModule } from './caixa/caixa.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ContaBancariaModule } from './conta-bancaria/conta-bancaria.module';
import { PeriodoModule } from './periodo/periodo.module';
import { CategoriaFinanceiraModule } from './categoria-financeira/categoria-financeira.module';
import { UsuarioTaxaModule } from './usuario-taxa/usuario-taxa.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { SalarioMinimoModule } from './salario-minimo/salario-minimo.module';
import { AuditoriaModule } from './auditoria/auditoria.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsuarioModule,
    NucleoModule,
    BalanceteModule,
    LancamentoModule,
    MensalidadeModule,
    TaxaModule,
    ConfiguracaoModule,
    ContaBancariaModule,
    CaixaModule,
    PeriodoModule,
    CategoriaFinanceiraModule,
    UsuarioTaxaModule,
    FileStorageModule,
    SalarioMinimoModule,
    AuditoriaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
