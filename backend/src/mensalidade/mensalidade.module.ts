import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mensalidade } from './mensalidade.entity';
import { MensalidadeService } from './mensalidade.service';
import { MensalidadeController } from './mensalidade.controller';
import { LancamentoModule } from '../lancamento/lancamento.module';
import { Taxa } from '../taxa/taxa.entity';
import { UsuarioModule } from '../usuario/usuario.module';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { UsuarioTaxaModule } from '../usuario-taxa/usuario-taxa.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mensalidade, Taxa]),
    forwardRef(() => LancamentoModule),
    UsuarioModule,
    ConfiguracaoModule,
    UsuarioTaxaModule,
  ],
  controllers: [MensalidadeController],
  providers: [MensalidadeService],
  exports: [MensalidadeService],
})
export class MensalidadeModule {}
