import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BalanceteService } from './balancete.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { Usuario } from '../usuario/usuario.entity';
import { CreateBalanceteDto } from './dto/create-balancete.dto';

@Controller('balancetes')
@UseGuards(AuthGuard('firebase-jwt'), RolesGuard)
export class BalanceteController {
  constructor(private readonly balanceteService: BalanceteService) {}

  @Post()
  @Roles(Role.TESOURARIA) // Minimo Tesouraria
  create(
    @Body() createDto: CreateBalanceteDto,
    @Request() req: { user: Usuario },
  ) {
    return this.balanceteService.create(createDto, req.user);
  }

  @Get()
  @Roles(Role.SOCIO) // Socio pode ver (filtrado no service/query)
  findAll(@Request() req: { user: Usuario }) {
    return this.balanceteService.findAll(req.user.nucleoId);
  }

  @Get(':id')
  @Roles(Role.SOCIO)
  findOne(@Param('id') id: string) {
    return this.balanceteService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(Role.CONSELHO_FISCAL, Role.TESOURARIA)
  approve(
    @Param('id') id: string,
    @Body() body: { status: 'APROVADO' | 'REPROVADO'; ressalva?: string },
    @Request() req: { user: Usuario },
  ) {
    return this.balanceteService.approve(
      id,
      req.user,
      body.status,
      body.ressalva,
    );
  }
}
