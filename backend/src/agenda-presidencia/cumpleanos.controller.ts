import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL_ADMINISTRADOR, ROL_PRESIDENCIA } from '../common/usuario-actual';
import { CumpleanosService } from './cumpleanos.service';

// En Laravel solo aparecía en el menú de ciertos RFC; aquí la valida el backend por rol.
@Controller('cumpleanos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_PRESIDENCIA, ROL_ADMINISTRADOR)
export class CumpleanosController {
  constructor(private readonly cumpleanosService: CumpleanosService) {}

  @Get()
  resumen() {
    return this.cumpleanosService.resumen();
  }

  /** `mes`: "actual", "siguiente" o 1 a 12. */
  @Get('mes/:mes')
  mes(@Param('mes') mes: string) {
    return this.cumpleanosService.mes(mes);
  }
}
