import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caixa } from './caixa.entity';
import { CaixaService } from './caixa.service';
import { CaixaController } from './caixa.controller';
import { NucleoModule } from '../nucleo/nucleo.module';

@Module({
  imports: [TypeOrmModule.forFeature([Caixa]), NucleoModule],
  controllers: [CaixaController],
  providers: [CaixaService],
  exports: [CaixaService],
})
export class CaixaModule {}
