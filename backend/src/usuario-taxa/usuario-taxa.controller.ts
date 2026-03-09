import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { UsuarioTaxaService } from './usuario-taxa.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';

interface AssignDto {
  usuarioIds: string[];
  taxaId: string;
  valorTotal: number;
  numParcelas: number;
  dataInicio: string;
}

@Controller('usuario-taxas')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class UsuarioTaxaController {
  constructor(private readonly service: UsuarioTaxaService) {}

  @Post('assign')
  @Roles(Role.TESOURARIA, Role.ADMIN_GLOBAL)
  async assign(@Body() body: AssignDto) {
    return this.service.assign(body);
  }

  @Post('preview')
  async preview(@Body() body: AssignDto) {
    return this.service.preview(body);
  }

  @Get('usuario/:id')
  async findAllByUsuario(@Param('id') id: string) {
    return this.service.findAllByUsuario(id);
  }
}
