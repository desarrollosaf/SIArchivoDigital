import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { ConcentracionService } from './concentracion.service';

@Controller('concentracion')
@UseGuards(JwtAuthGuard)
export class ConcentracionController {
  constructor(private readonly concentracionService: ConcentracionService) {}

  @Get()
  listar(@Usuario() usuario: UsuarioActual) {
    return this.concentracionService.listar(usuario);
  }
}
