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
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROL_ADMINISTRADOR } from '../common/usuario-actual';
import { GruposService } from './grupos.service';

class GrupoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  grupo!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos un integrante' })
  @IsString({ each: true })
  miembros!: string[];
}

@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_ADMINISTRADOR)
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get()
  listar() {
    return this.gruposService.listar();
  }

  @Post()
  crear(@Body() dto: GrupoDto) {
    return this.gruposService.crear(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: GrupoDto) {
    return this.gruposService.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.eliminar(id);
  }
}
