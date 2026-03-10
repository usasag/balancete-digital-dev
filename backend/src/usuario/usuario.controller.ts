import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Patch,
  Body,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Usuario } from './usuario.entity';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('usuarios')
@UseGuards(AuthGuard('firebase-jwt'))
export class UsuarioController {
  constructor(private readonly service: UsuarioService) {}

  @Get('nucleo/:id')
  findAllByNucleo(@Param('id') id: string) {
    return this.service.findAllByNucleo(id);
  }

  @Get('me')
  getMe(@Req() req: Request & { user: Usuario }) {
    return req.user;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN_GLOBAL, Role.PRESIDENCIA, Role.TESOURARIA)
  update(@Param('id') id: string, @Body() data: UpdateUsuarioDto) {
    return this.service.update(id, data);
  }
}
