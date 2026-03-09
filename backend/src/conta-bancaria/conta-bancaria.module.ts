import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContaBancaria } from './conta-bancaria.entity';
import { ContaBancariaService } from './conta-bancaria.service';
import { ContaBancariaController } from './conta-bancaria.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContaBancaria])],
  controllers: [ContaBancariaController],
  providers: [ContaBancariaService],
  exports: [ContaBancariaService],
})
export class ContaBancariaModule {}
