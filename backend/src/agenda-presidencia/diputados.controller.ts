import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL_ADMINISTRADOR, ROL_PRESIDENCIA } from '../common/usuario-actual';
import { DiputadosService } from './diputados.service';

@Controller('diputados')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_PRESIDENCIA, ROL_ADMINISTRADOR)
export class DiputadosController {
  constructor(private readonly diputadosService: DiputadosService) {}

  @Get()
  listar() {
    return this.diputadosService.listar();
  }

  @Get(':id')
  ficha(@Param('id') id: string) {
    return this.diputadosService.ficha(id);
  }
}
