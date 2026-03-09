import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoFinanceira } from './configuracao.entity';
import { ConfiguracaoService } from './configuracao.service';
import { ConfiguracaoController } from './configuracao.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracaoFinanceira])],
  controllers: [ConfiguracaoController],
  providers: [ConfiguracaoService],
  exports: [ConfiguracaoService],
})
export class ConfiguracaoModule {}
