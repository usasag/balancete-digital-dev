import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MensalidadeService } from './mensalidade.service';
import { AuthGuard } from '@nestjs/passport';
import { Mensalidade } from './mensalidade.entity';
import type { DeepPartial } from 'typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('mensalidades')
@UseGuards(AuthGuard('firebase-jwt'))
export class MensalidadeController {
  constructor(private readonly service: MensalidadeService) {}

  @Post('generate-now')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async generateNow() {
    return await this.service.generateNow();
  }

  @Post('generate-reference')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  generateReference(@Body() body: { nucleoId: string; mesReferencia: string }) {
    return this.service.generateForReference(body.nucleoId, body.mesReferencia);
  }

  @Post()
  create(@Body() data: DeepPartial<Mensalidade>) {
    return this.service.create(data);
  }

  @Get('nucleo/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  findAllByNucleo(@Param('id') id: string) {
    return this.service.findAllByNucleo(id);
  }

  @Get('socio/:id')
  findAllBySocio(@Param('id') id: string) {
    return this.service.findAllBySocio(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: DeepPartial<Mensalidade>) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/pay')
  pay(@Param('id') id: string, @Body() body: { date?: string }) {
    return this.service.pay(id, body.date ? new Date(body.date) : undefined);
  }

  @Post('bulk/pay')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  payBulk(@Body() body: { ids: string[]; date?: string }) {
    return this.service.payBulk(
      body.ids || [],
      body.date ? new Date(body.date) : undefined,
    );
  }

  @Post(':id/agreement')
  registerAgreement(@Param('id') id: string, @Body() body: { date: string }) {
    return this.service.registerAgreement(id, new Date(body.date));
  }

  @Post(':id/taxa')
  addTaxa(@Param('id') id: string, @Body() body: { taxaId: string }) {
    return this.service.addTaxa(id, body.taxaId);
  }

  @Delete(':id/taxa/:index')
  removeTaxa(@Param('id') id: string, @Param('index') index: number) {
    return this.service.removeTaxa(id, index);
  }

  @Get('inadimplencia/:nucleoId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  async getInadimplenciaReport(@Param('nucleoId') nucleoId: string) {
    return this.service.getInadimplenciaReport(nucleoId);
  }
}
