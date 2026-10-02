import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('resumen')
  resumen(
    @Usuario() usuario: UsuarioActual,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('todos') todos?: string,
  ) {
    return this.reportesService.resumen(
      usuario,
      desde,
      hasta,
      todos === 'true',
    );
  }

  @Get('concentrado')
  async concentrado(
    @Usuario() usuario: UsuarioActual,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response,
    @Query('todos') todos?: string,
  ) {
    const buffer = await this.reportesService.concentradoExcel(
      usuario,
      desde,
      hasta,
      todos === 'true',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="concentrado_${desde}_${hasta}.xlsx"`,
    );
    res.send(buffer);
  }
}
