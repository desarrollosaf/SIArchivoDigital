import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('resumen')
  resumen(@Usuario() usuario: UsuarioActual) {
    return this.notificacionesService.resumen(usuario);
  }

  @Get()
  listar(@Usuario() usuario: UsuarioActual) {
    return this.notificacionesService.listar(usuario);
  }

  @Post('leidas')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarTodasLeidas(@Usuario() usuario: UsuarioActual) {
    return this.notificacionesService.marcarTodasLeidas(usuario);
  }

  @Post(':tipo/:id/leida')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarLeida(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.notificacionesService.marcarLeida(tipo, id, usuario);
  }
}
