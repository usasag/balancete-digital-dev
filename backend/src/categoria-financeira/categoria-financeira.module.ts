import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaFinanceiraService } from './categoria-financeira.service';
import { CategoriaFinanceiraController } from './categoria-financeira.controller';
import { CategoriaFinanceira } from './categoria-financeira.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaFinanceira])],
  controllers: [CategoriaFinanceiraController],
  providers: [CategoriaFinanceiraService],
  exports: [CategoriaFinanceiraService],
})
export class CategoriaFinanceiraModule {}
