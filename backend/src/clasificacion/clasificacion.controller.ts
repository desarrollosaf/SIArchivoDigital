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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL_ADMINISTRADOR } from '../common/usuario-actual';
import { ClasificacionService } from './clasificacion.service';
import { SeccionDto, SerieDto, SubSerieDto } from './dto/clasificacion.dto';

@Controller('clasificacion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_ADMINISTRADOR)
export class ClasificacionController {
  constructor(private readonly clasificacionService: ClasificacionService) {}

  @Get('secciones')
  secciones() {
    return this.clasificacionService.secciones();
  }

  @Post('secciones')
  crearSeccion(@Body() dto: SeccionDto) {
    return this.clasificacionService.crearSeccion(dto);
  }

  @Patch('secciones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  editarSeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SeccionDto,
  ) {
    return this.clasificacionService.editarSeccion(id, dto);
  }

  @Post('secciones/:id/estatus')
  @HttpCode(HttpStatus.NO_CONTENT)
  alternarSeccion(@Param('id', ParseIntPipe) id: number) {
    return this.clasificacionService.alternarSeccion(id);
  }

  @Get('secciones/:id/series')
  seriesDeSeccion(@Param('id', ParseIntPipe) id: number) {
    return this.clasificacionService.seriesDeSeccion(id);
  }

  @Post('series')
  crearSerie(@Body() dto: SerieDto) {
    return this.clasificacionService.crearSerie(dto);
  }

  @Patch('series/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  editarSerie(@Param('id', ParseIntPipe) id: number, @Body() dto: SerieDto) {
    return this.clasificacionService.editarSerie(id, dto);
  }

  @Post('series/:id/estatus')
  @HttpCode(HttpStatus.NO_CONTENT)
  alternarSerie(@Param('id', ParseIntPipe) id: number) {
    return this.clasificacionService.alternarSerie(id);
  }

  @Get('series/:id/subseries')
  subseriesDeSerie(@Param('id', ParseIntPipe) id: number) {
    return this.clasificacionService.subseriesDeSerie(id);
  }

  @Post('subseries')
  crearSubserie(@Body() dto: SubSerieDto) {
    return this.clasificacionService.crearSubserie(dto);
  }

  @Patch('subseries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  editarSubserie(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubSerieDto,
  ) {
    return this.clasificacionService.editarSubserie(id, dto);
  }

  @Post('subseries/:id/estatus')
  @HttpCode(HttpStatus.NO_CONTENT)
  alternarSubserie(@Param('id', ParseIntPipe) id: number) {
    return this.clasificacionService.alternarSubserie(id);
  }
}
