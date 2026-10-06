import {
  BadRequestException,
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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { anioActualMexico } from '../common/fecha-mexico.util';
import {
  ROL_ADMINISTRADOR,
  ROL_PRESIDENCIA,
  Usuario,
  type UsuarioActual,
} from '../common/usuario-actual';
import { EventosLegislativosService } from './eventos-legislativos.service';
import { EventoLegislativoDto } from './dto/evento-legislativo.dto';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

@Controller('agenda-presidencia/legislativos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_PRESIDENCIA, ROL_ADMINISTRADOR)
export class EventosLegislativosController {
  constructor(private readonly eventosService: EventosLegislativosService) {}

  @Get('catalogos')
  catalogos() {
    return this.eventosService.catalogos();
  }

  @Get('disponibilidad')
  disponibilidad(
    @Query('fecha') fecha: string,
    @Query('inicio') inicio: string,
    @Query('termino') termino: string,
    @Query('sede') sede: string,
    @Query('excluir') excluir?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (!FECHA.test(fecha ?? '') || !inicio || !termino || !Number(sede)) {
      throw new BadRequestException('Indica fecha, horario y sede');
    }
    return this.eventosService.disponibilidad(
      fecha,
      inicio,
      termino,
      Number(sede),
      excluir ? Number(excluir) : undefined,
      hasta && FECHA.test(hasta) ? hasta : null,
    );
  }

  @Get()
  listar(@Query('anio') anio?: string) {
    return this.eventosService.listar(anio ? Number(anio) : anioActualMexico());
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.obtener(id);
  }

  @Post()
  crear(@Body() dto: EventoLegislativoDto, @Usuario() usuario: UsuarioActual) {
    return this.eventosService.crear(dto, usuario);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EventoLegislativoDto,
  ) {
    return this.eventosService.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.eliminar(id);
  }
}
