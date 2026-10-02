import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MAX_ARCHIVO_BYTES } from '../common/archivos.service';
import { ATexto } from '../common/transformaciones';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { ComentariosService } from './comentarios.service';

const ARCHIVO_INTERCEPTOR = FileInterceptor('archivo', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_ARCHIVO_BYTES },
});

class ComentarioDto {
  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(5000)
  texto?: string;

  /** RFC del destinatario; vacío = comentario general del registro. */
  @IsOptional()
  @ATexto()
  @IsString()
  para?: string;
}

@Controller('comentarios')
@UseGuards(JwtAuthGuard)
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post('registro/:registroId')
  @UseInterceptors(ARCHIVO_INTERCEPTOR)
  comentar(
    @Param('registroId', ParseIntPipe) registroId: number,
    @Body() dto: ComentarioDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.comentariosService.comentar(
      registroId,
      dto.texto,
      dto.para,
      archivo,
      usuario,
    );
  }

  @Post(':id/respuestas')
  @UseInterceptors(ARCHIVO_INTERCEPTOR)
  responder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ComentarioDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.comentariosService.responder(id, dto.texto, archivo, usuario);
  }

  @Get(':id/archivo')
  async archivoComentario(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
    @Res() res: Response,
  ) {
    await this.comentariosService.enviarArchivoComentario(id, usuario, res);
  }

  @Get('respuestas/:id/archivo')
  async archivoRespuesta(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
    @Res() res: Response,
  ) {
    await this.comentariosService.enviarArchivoRespuesta(id, usuario, res);
  }
}
