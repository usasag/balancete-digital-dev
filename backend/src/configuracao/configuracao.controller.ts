import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ConfiguracaoService } from './configuracao.service';
import { AuthGuard } from '@nestjs/passport';
import { ConfiguracaoFinanceira } from './configuracao.entity';
import type { DeepPartial } from 'typeorm';

@Controller('configuracao')
@UseGuards(AuthGuard('firebase-jwt'))
export class ConfiguracaoController {
  constructor(private readonly service: ConfiguracaoService) {}

  @Get()
  async get(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const nucleoId = req.user.nucleoId as string;
    if (!nucleoId)
      throw new BadRequestException('Usuário não está vinculado a um núcleo.');
    return this.service.findOneByNucleo(nucleoId);
  }

  @Put()
  async update(
    @Request() req: any,
    @Body() data: DeepPartial<ConfiguracaoFinanceira>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const nucleoId = req.user.nucleoId as string;
    if (!nucleoId)
      throw new BadRequestException('Usuário não está vinculado a um núcleo.');
    return this.service.update(nucleoId, data);
  }
}
