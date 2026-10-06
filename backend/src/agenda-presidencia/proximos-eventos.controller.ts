import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL_ADMINISTRADOR, ROL_PRESIDENCIA } from '../common/usuario-actual';
import { ProximosEventosService } from './proximos-eventos.service';

@Controller('agenda-presidencia/proximos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_PRESIDENCIA, ROL_ADMINISTRADOR)
export class ProximosEventosController {
  constructor(private readonly proximosService: ProximosEventosService) {}

  /** `fecha` (YYYY-MM-DD) es opcional: por defecto, mañana. */
  @Get()
  listar(@Query('fecha') fecha?: string) {
    return this.proximosService.listar(fecha);
  }

  @Get(':id/archivo')
  async archivo(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.proximosService.enviarArchivo(id, res);
  }
}
