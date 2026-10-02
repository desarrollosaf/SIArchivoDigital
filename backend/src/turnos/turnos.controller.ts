import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { TurnosService } from './turnos.service';
import { ConcluirTurnoDto, TurnarDto } from './dto/turnos.dto';

@Controller('turnos')
@UseGuards(JwtAuthGuard)
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Get('resumen')
  resumen(@Usuario() usuario: UsuarioActual) {
    return this.turnosService.resumen(usuario);
  }

  @Get()
  listar(
    @Usuario() usuario: UsuarioActual,
    @Query('estatus') estatus?: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
  ) {
    return this.turnosService.listar(
      usuario,
      estatus === 'atendidos' ? 'atendidos' : 'pendientes',
      anio ? Number(anio) : undefined,
      mes ? Number(mes) : undefined,
    );
  }

  @Post('registro/:registroId')
  turnar(
    @Param('registroId', ParseIntPipe) registroId: number,
    @Body() dto: TurnarDto,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.turnosService.turnar(registroId, dto, usuario);
  }

  @Post(':id/visto')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarVisto(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.turnosService.marcarVisto(id, usuario);
  }

  @Post(':id/concluir')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ARCHIVO_BYTES },
    }),
  )
  concluir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConcluirTurnoDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.turnosService.concluir(id, dto, archivo, usuario);
  }

  @Get(':id/conclusion')
  async conclusion(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
    @Res() res: Response,
  ) {
    await this.turnosService.enviarConclusion(id, usuario, res);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.turnosService.cancelar(id, usuario);
  }
}
