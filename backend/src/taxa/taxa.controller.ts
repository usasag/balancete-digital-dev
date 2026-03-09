import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { TaxaService } from './taxa.service';
import { AuthGuard } from '@nestjs/passport';
import { Taxa } from './taxa.entity';
import type { DeepPartial } from 'typeorm';

@Controller('taxas')
@UseGuards(AuthGuard('firebase-jwt'))
export class TaxaController {
  constructor(private readonly service: TaxaService) {}

  @Post()
  create(@Request() req: any, @Body() data: DeepPartial<Taxa>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const nucleoId = req.user.nucleoId as string;
    if (!nucleoId)
      throw new BadRequestException('Usuário não está vinculado a um núcleo.');
    return this.service.create({ ...data, nucleoId });
  }

  @Get()
  findAll(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const nucleoId = req.user.nucleoId as string;
    if (!nucleoId)
      throw new BadRequestException('Usuário não está vinculado a um núcleo.');
    return this.service.findAllByNucleo(nucleoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: DeepPartial<Taxa>) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
