import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL_ADMINISTRADOR, ROL_PRESIDENCIA } from '../common/usuario-actual';
import { AgendaPresidenciaService } from './agenda-presidencia.service';

function sedeNumero(sede?: string): number | undefined {
  return sede ? Number(sede) || undefined : undefined;
}

// En Laravel la restricción solo estaba en el menú (cualquiera entraba por URL); aquí la valida
// el backend.
@Controller('agenda-presidencia')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_PRESIDENCIA, ROL_ADMINISTRADOR)
export class AgendaPresidenciaController {
  constructor(
    private readonly agendaPresidenciaService: AgendaPresidenciaService,
  ) {}

  @Get('sedes')
  sedes() {
    return this.agendaPresidenciaService.sedes();
  }

  @Get('eventos')
  eventos(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('sede') sede?: string,
  ) {
    return this.agendaPresidenciaService.eventos(
      desde,
      hasta,
      sedeNumero(sede),
    );
  }

  @Get('eventos/:id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.agendaPresidenciaService.detalle(id);
  }

  @Get('reporte')
  reporte(
    @Query('tipo') tipo: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta?: string,
    @Query('sede') sede?: string,
  ) {
    return this.agendaPresidenciaService.reporte(
      tipo === 'comisiones' ? 'comisiones' : 'general',
      desde,
      hasta,
      sedeNumero(sede),
    );
  }
}
