import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ANumero, ATexto } from '../common/transformaciones';
import { ROL_ADMINISTRADOR, ROL_PRESIDENCIA } from '../common/usuario-actual';
import { GabineteService } from './gabinete.service';

const FOTO_INTERCEPTOR = FileInterceptor('foto', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

class GabineteDto {
  @ATexto()
  @IsString()
  @IsNotEmpty({ message: 'Captura el nombre' })
  @MaxLength(255)
  nombre!: string;

  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255)
  cargo?: string;

  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255)
  profesion?: string;

  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255)
  otros?: string;

  @IsOptional()
  @ATexto()
  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento?: string;

  @ANumero()
  @IsIn([0, 1], {
    message: 'Indica si es del Gobierno del Estado o del Congreso',
  })
  tipo!: number;
}

@Controller('gabinete')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_PRESIDENCIA, ROL_ADMINISTRADOR)
export class GabineteController {
  constructor(private readonly gabineteService: GabineteService) {}

  @Get()
  listar() {
    return this.gabineteService.listar();
  }

  @Post()
  @UseInterceptors(FOTO_INTERCEPTOR)
  crear(
    @Body() dto: GabineteDto,
    @UploadedFile() foto: Express.Multer.File | undefined,
  ) {
    return this.gabineteService.crear(dto, foto);
  }

  @Patch(':id')
  @UseInterceptors(FOTO_INTERCEPTOR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GabineteDto,
    @UploadedFile() foto: Express.Multer.File | undefined,
  ) {
    return this.gabineteService.actualizar(id, dto, foto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.gabineteService.eliminar(id);
  }

  @Get(':id/foto')
  async foto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.gabineteService.enviarFoto(id, res);
  }
}
