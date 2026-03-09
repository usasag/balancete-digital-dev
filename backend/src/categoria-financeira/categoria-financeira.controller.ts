import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CategoriaFinanceiraService } from './categoria-financeira.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';

import { CategoriaFinanceira } from './categoria-financeira.entity';

@Controller('categorias-financeiras')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class CategoriaFinanceiraController {
  constructor(private readonly service: CategoriaFinanceiraService) {}

  @Post()
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  create(@Body() createDto: Partial<CategoriaFinanceira>) {
    return this.service.create(createDto);
  }

  @Get('nucleo/:nucleoId')
  @Roles(
    Role.TESOURARIA,
    Role.ADMIN_GLOBAL,
    Role.PRESIDENCIA,
    Role.CONTABILIDADE_UNICA,
    Role.CONSELHO_FISCAL,
  )
  findAll(@Param('nucleoId') nucleoId: string) {
    return this.service.findAll(nucleoId);
  }

  @Get(':id')
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CategoriaFinanceira>,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
