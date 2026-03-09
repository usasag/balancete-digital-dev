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
import { ContaBancariaService } from './conta-bancaria.service';
import { ContaBancaria } from './conta-bancaria.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('contas-bancarias')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class ContaBancariaController {
  constructor(private readonly service: ContaBancariaService) {}

  @Get('nucleo/:nucleoId')
  async findAllByNucleo(
    @Param('nucleoId') nucleoId: string,
  ): Promise<ContaBancaria[]> {
    return this.service.findAllByNucleo(nucleoId);
  }

  @Post()
  async create(@Body() data: Partial<ContaBancaria>): Promise<ContaBancaria> {
    return this.service.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<ContaBancaria>,
  ): Promise<ContaBancaria> {
    return this.service.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
