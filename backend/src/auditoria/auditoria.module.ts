import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaLog } from './auditoria-log.entity';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaLog]), AuthModule],
  providers: [AuditoriaService],
  controllers: [AuditoriaController],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
