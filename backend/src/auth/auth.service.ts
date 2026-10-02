import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersSafs } from '../database/models/users-safs.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { RolesService } from '../roles/roles.service';
import { nombreCompleto } from '../common/padron.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UsersSafs, 'external')
    private readonly usersSafsModel: typeof UsersSafs,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(rfc: string, password: string) {
    const user = await this.usersSafsModel.findOne({
      where: { rfc: rfc.trim().toUpperCase() },
      include: [{ model: SUsuario, as: 'datos_user' }],
    });

    // bcryptjs valida los hashes "$2y$" que genera Laravel, así que las contraseñas son las mismas.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('RFC o contraseña incorrectos');
    }

    // users_safs es compartida: si otro sistema bloqueó la cuenta, aquí tampoco entra.
    if (user.bloqueo) {
      throw new UnauthorizedException(
        'Tu cuenta está bloqueada por intentos fallidos. Contacta al administrador del sistema.',
      );
    }

    // En s_usuario, Nombre ya trae el nombre completo; los apellidos solo se agregan si faltan.
    const nombre = user.datos_user
      ? nombreCompleto(user.datos_user)
      : user.name;

    const rol = await this.rolesService.getRolForRfc(user.rfc);

    const payload = { sub: user.id, rfc: user.rfc, rol };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwtSecret'),
      expiresIn: this.configService.get<number>('auth.jwtExpiresInSeconds'),
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        rfc: user.rfc,
        email: user.email,
        nombre,
        puesto: user.datos_user?.Puesto ?? null,
        path_foto: user.path_foto,
        cambio_contrasena: !!user.cambio_contrasena,
        rol,
      },
    };
  }
}
