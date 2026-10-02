import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { AgendaService } from './agenda.service';

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  eventos(
    @Usuario() usuario: UsuarioActual,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.agendaService.eventos(usuario, desde, hasta);
  }
}
