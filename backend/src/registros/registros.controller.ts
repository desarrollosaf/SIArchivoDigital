import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MAX_ARCHIVO_BYTES } from '../common/archivos.service';
import { anioActualMexico } from '../common/fecha-mexico.util';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { RegistrosService, type FiltroEstatus } from './registros.service';
import { RegistroDto } from './dto/registro.dto';

const ARCHIVO_INTERCEPTOR = FileInterceptor('archivo', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_ARCHIVO_BYTES },
});

const ESTATUS_VALIDOS: FiltroEstatus[] = [
  'pendientes',
  'concluidos',
  'cancelados',
  'todos',
];

@Controller('registros')
@UseGuards(JwtAuthGuard)
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) {}

  @Get()
  listar(
    @Usuario() usuario: UsuarioActual,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('estatus') estatus?: string,
  ) {
    const filtro = ESTATUS_VALIDOS.includes(estatus as FiltroEstatus)
      ? (estatus as FiltroEstatus)
      : 'todos';
    return this.registrosService.listar(
      usuario,
      anio ? Number(anio) : anioActualMexico(),
      mes ? Number(mes) : undefined,
      filtro,
    );
  }

  @Get('nuevo/contexto')
  contextoNuevo(@Usuario() usuario: UsuarioActual) {
    return this.registrosService.contextoNuevo(usuario);
  }

  @Get('buscar')
  buscar(@Usuario() usuario: UsuarioActual, @Query('q') q: string) {
    return this.registrosService.buscar(usuario, q);
  }

  @Get('rastreables')
  rastreables(
    @Usuario() usuario: UsuarioActual,
    @Query('search') search?: string,
  ) {
    return this.registrosService.rastreables(usuario, search);
  }

  @Get(':id')
  detalle(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.registrosService.detalle(id, usuario);
  }

  @Get(':id/archivo')
  async archivo(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
    @Res() res: Response,
  ) {
    await this.registrosService.enviarArchivo(id, usuario, res);
  }

  @Post()
  @UseInterceptors(ARCHIVO_INTERCEPTOR)
  crear(
    @Body() dto: RegistroDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.registrosService.crear(dto, archivo, usuario);
  }

  @Patch(':id')
  @UseInterceptors(ARCHIVO_INTERCEPTOR)
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistroDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.registrosService.editar(id, dto, archivo, usuario);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.registrosService.cancelar(id, usuario);
  }
}
