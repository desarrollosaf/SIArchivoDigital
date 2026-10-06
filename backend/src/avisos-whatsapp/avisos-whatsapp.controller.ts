import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ATexto } from '../common/transformaciones';
import { ROL_ADMINISTRADOR } from '../common/usuario-actual';
import {
  AvisosCumpleanosService,
  type MesPdf,
} from './avisos-cumpleanos.service';
import { WhatsappService } from './whatsapp.service';

class DestinatarioDto {
  @ATexto()
  @IsString()
  @IsNotEmpty({ message: 'Captura el nombre' })
  @MaxLength(150)
  nombre!: string;

  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  telefono!: string;

  @IsBoolean()
  activo!: boolean;
}

class EnviarPdfDto {
  @IsIn(['actual', 'siguiente'])
  mes!: MesPdf;
}

@Controller('avisos-whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_ADMINISTRADOR)
export class AvisosWhatsappController {
  constructor(
    private readonly avisos: AvisosCumpleanosService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Get('estado')
  async estado() {
    return {
      ...this.whatsapp.estado(),
      mensajeHoy: await this.avisos.mensajeDelDia(),
    };
  }

  @Get('destinatarios')
  destinatarios() {
    return this.avisos.destinatarios();
  }

  @Post('destinatarios')
  crear(@Body() dto: DestinatarioDto) {
    return this.avisos.guardarDestinatario(null, dto);
  }

  @Patch('destinatarios/:id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DestinatarioDto,
  ) {
    return this.avisos.guardarDestinatario(id, dto);
  }

  @Delete('destinatarios/:id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.avisos.eliminarDestinatario(id);
  }

  /** El PDF tal como se enviaría, para revisarlo sin mandarlo. */
  @Get('pdf')
  async pdf(@Query('mes') mes: string, @Res() res: Response) {
    const { archivo, nombre } = await this.avisos.generarPdf(mes || 'actual');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
    res.send(archivo);
  }

  @Post('enviar/dia')
  @HttpCode(HttpStatus.OK)
  enviarDia() {
    this.avisos.validarEnvioManual();
    return this.avisos.enviarDelDia();
  }

  @Post('enviar/pdf')
  @HttpCode(HttpStatus.OK)
  enviarPdf(@Body() dto: EnviarPdfDto) {
    this.avisos.validarEnvioManual();
    return this.avisos.enviarPdf(dto.mes);
  }
}
