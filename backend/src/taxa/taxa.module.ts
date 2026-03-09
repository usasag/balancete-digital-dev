import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Taxa } from './taxa.entity';
import { TaxaService } from './taxa.service';
import { TaxaController } from './taxa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Taxa])],
  controllers: [TaxaController],
  providers: [TaxaService],
  exports: [TaxaService],
})
export class TaxaModule {}
