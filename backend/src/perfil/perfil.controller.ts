import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { PerfilService } from './perfil.service';

const MAX_FOTO_BYTES = 5 * 1024 * 1024;

class DatosContactoDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(255)
  email!: string;

  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  cel!: string;

  @IsBoolean()
  whats!: boolean;
}

class ContrasenaDto {
  @IsString()
  @IsNotEmpty({ message: 'Captura tu contraseña actual' })
  actual!: string;

  @IsString()
  @MaxLength(72, { message: 'La contraseña es demasiado larga' })
  nueva!: string;
}

@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  datos(@Usuario() usuario: UsuarioActual) {
    return this.perfilService.datos(usuario);
  }

  @Patch()
  actualizar(@Usuario() usuario: UsuarioActual, @Body() dto: DatosContactoDto) {
    return this.perfilService.actualizarDatos(usuario, dto);
  }

  @Get('foto')
  async foto(@Usuario() usuario: UsuarioActual, @Res() res: Response) {
    await this.perfilService.enviarFoto(usuario, res);
  }

  @Post('foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FOTO_BYTES },
    }),
  )
  actualizarFoto(
    @Usuario() usuario: UsuarioActual,
    @UploadedFile() foto: Express.Multer.File | undefined,
  ) {
    if (!foto) throw new BadRequestException('Selecciona una foto.');
    return this.perfilService.actualizarFoto(usuario, foto);
  }

  @Post('contrasena')
  @HttpCode(HttpStatus.OK)
  contrasena(@Usuario() usuario: UsuarioActual, @Body() dto: ContrasenaDto) {
    return this.perfilService.cambiarContrasena(usuario, dto.actual, dto.nueva);
  }
}
