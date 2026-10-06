import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { UsersSafs } from '../database/models/users-safs.model';
import { ArchivosService, tieneArchivo } from '../common/archivos.service';
import type { UsuarioActual } from '../common/usuario-actual';

const EXTENSIONES_FOTO = ['.jpg', '.jpeg', '.png'];

/**
 * Lo que cada usuario cambia de su propia cuenta (users_safs, compartida con los demás sistemas
 * de la SAF): contraseña, datos de contacto y foto. En Laravel: ContrasenaController y
 * DatosPersonalesController.
 */
@Injectable()
export class PerfilService {
  constructor(
    @InjectModel(UsersSafs, 'external')
    private readonly usersSafsModel: typeof UsersSafs,
    private readonly archivos: ArchivosService,
  ) {}

  async datos(usuario: UsuarioActual) {
    const u = await this.cuenta(usuario);
    return {
      rfc: u.rfc,
      email: u.email ?? '',
      cel: u.cel ?? '',
      whats: Number(u.whats) === 1,
      tieneFoto: tieneArchivo(u.path_foto),
    };
  }

  async actualizarDatos(
    usuario: UsuarioActual,
    datos: { email: string; cel: string; whats: boolean },
  ) {
    const u = await this.cuenta(usuario);
    await u.update({
      email: datos.email,
      cel: datos.cel,
      whats: datos.whats ? 1 : 0,
    });
    return this.datos(usuario);
  }

  /** Se guarda como "fotos/RFC.png" en storage/app/public, igual que Laravel. */
  async actualizarFoto(usuario: UsuarioActual, foto: Express.Multer.File) {
    const u = await this.cuenta(usuario);
    const ruta = await this.archivos.guardarEn(
      foto,
      `fotos/${u.rfc}.png`,
      EXTENSIONES_FOTO,
      'publico',
    );
    await u.update({ path_foto: ruta });
    return this.datos(usuario);
  }

  async enviarFoto(usuario: UsuarioActual, res: Response) {
    const u = await this.cuenta(usuario);
    this.archivos.enviar(res, u.path_foto, undefined, 'publico');
  }

  /** Mismas reglas que Laravel: la actual debe coincidir y la nueva ser robusta. */
  async cambiarContrasena(
    usuario: UsuarioActual,
    actual: string,
    nueva: string,
  ) {
    const u = await this.cuenta(usuario);
    if (!(await bcrypt.compare(actual, u.password))) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    const falta = faltantesContrasena(nueva);
    if (falta.length) {
      throw new BadRequestException(
        `La nueva contraseña debe tener ${falta.join(', ')}.`,
      );
    }
    if (await bcrypt.compare(nueva, u.password)) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }
    // Hash bcrypt con prefijo $2y$, el que genera Laravel, para que los otros sistemas que
    // comparten users_safs la sigan validando.
    const hash = (await bcrypt.hash(nueva, 10)).replace(
      /^\$2[ab]\$/,
      () => '$2y$',
    );
    await u.update({ password: hash, cambio_contrasena: 1 });
    return { ok: true };
  }

  private async cuenta(usuario: UsuarioActual) {
    const u = await this.usersSafsModel.findByPk(usuario.sub);
    if (!u) throw new NotFoundException('No se encontró tu cuenta.');
    return u;
  }
}

export function faltantesContrasena(clave: string): string[] {
  const falta: string[] = [];
  if (clave.length < 8) falta.push('al menos 8 caracteres');
  if (!/[A-Z]/.test(clave)) falta.push('una mayúscula');
  if (!/[a-z]/.test(clave)) falta.push('una minúscula');
  if (!/\d/.test(clave)) falta.push('un número');
  if (!/[^\w]/.test(clave)) falta.push('un carácter especial');
  return falta;
}
