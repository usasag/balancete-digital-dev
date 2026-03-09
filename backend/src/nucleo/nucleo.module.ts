import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nucleo } from './nucleo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nucleo])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class NucleoModule {}
