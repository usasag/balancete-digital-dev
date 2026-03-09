import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { CaixaService } from './caixa.service';
import { Caixa } from './caixa.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('caixas')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class CaixaController {
  constructor(private readonly caixaService: CaixaService) {}

  @Get('nucleo/:nucleoId')
  async findAllByNucleo(@Param('nucleoId') nucleoId: string): Promise<Caixa[]> {
    return this.caixaService.findAllByNucleo(nucleoId);
  }

  @Post()
  async create(@Body() caixaData: Partial<Caixa>): Promise<Caixa> {
    return this.caixaService.create(caixaData);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() caixaData: Partial<Caixa>,
  ): Promise<Caixa> {
    return this.caixaService.update(id, caixaData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.caixaService.remove(id);
  }
}
