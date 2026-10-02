import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { CatalogosService } from './catalogos.service';

@Controller('catalogos')
@UseGuards(JwtAuthGuard)
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('tipos-atencion')
  tiposAtencion() {
    return this.catalogosService.tiposAtencion();
  }

  @Get('tipos-solicitud')
  tiposSolicitud() {
    return this.catalogosService.tiposSolicitud();
  }

  @Get('salones')
  salones() {
    return this.catalogosService.salones();
  }

  @Get('modalidades')
  modalidades() {
    return this.catalogosService.modalidades();
  }

  @Get('series')
  series(@Usuario() usuario: UsuarioActual) {
    return this.catalogosService.seriesParaRegistro(usuario.rfc);
  }

  @Get('secciones')
  secciones(@Usuario() usuario: UsuarioActual) {
    return this.catalogosService.seccionesDelUsuario(usuario.rfc);
  }

  @Get('secciones/:id/series')
  seriesDeSeccion(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.seriesDeSeccion(id);
  }

  @Get('series/:id/subseries')
  subseriesDeSerie(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.subseriesDeSerie(id);
  }

  @Get('servidores-publicos')
  servidoresPublicos(@Query('search') search?: string) {
    return this.catalogosService.servidoresPublicos(search);
  }

  @Get('destinatarios')
  destinatarios(
    @Usuario() usuario: UsuarioActual,
    @Query('search') search?: string,
  ) {
    return this.catalogosService.destinatarios(usuario.rfc, search);
  }

  @Get('departamentos')
  departamentos() {
    return this.catalogosService.departamentos();
  }
}
