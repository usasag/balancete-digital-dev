import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioTaxa } from './usuario-taxa.entity';
import { UsuarioTaxaService } from './usuario-taxa.service';
import { UsuarioTaxaController } from './usuario-taxa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioTaxa])],
  controllers: [UsuarioTaxaController],
  providers: [UsuarioTaxaService],
  exports: [UsuarioTaxaService],
})
export class UsuarioTaxaModule {}
