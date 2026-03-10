import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ConfiguracaoService } from './configuracao.service';
import { AuthGuard } from '@nestjs/passport';
import { ConfiguracaoFinanceira } from './configuracao.entity';
import type { DeepPartial } from 'typeorm';
import type { RequestWithUser } from '../auth/request-with-user';

@Controller('configuracao')
@UseGuards(AuthGuard('firebase-jwt'))
export class ConfiguracaoController {
  constructor(private readonly service: ConfiguracaoService) {}

  @Get()
  async get(@Req() req: RequestWithUser) {
    const nucleoId = req.user.nucleoId;
    if (!nucleoId)
      throw new BadRequestException('Usuário não está vinculado a um núcleo.');
    return this.service.findOneByNucleo(nucleoId);
  }

  @Put()
  async update(
    @Req() req: RequestWithUser,
    @Body() data: DeepPartial<ConfiguracaoFinanceira>,
  ) {
    const nucleoId = req.user.nucleoId;
    if (!nucleoId)
      throw new BadRequestException('Usuário não está vinculado a um núcleo.');
    return this.service.update(nucleoId, data);
  }
}
