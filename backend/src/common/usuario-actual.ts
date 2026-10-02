import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const ROL_ADMINISTRADOR = 'administrador';
/** Ve la Agenda de Presidencia (en Laravel era una lista de RFC fija en el menú). */
export const ROL_PRESIDENCIA = 'presidencia';

/** Lo que guarda el token: `sub` es `users_safs.id`. */
export interface UsuarioActual {
  sub: number;
  rfc: string;
  rol: string;
}

/** Inyecta en el handler el payload del token que dejó JwtAuthGuard en `request.user`. */
export const Usuario = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioActual => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request['user'] as UsuarioActual;
  },
);

export function esAdministrador(usuario: UsuarioActual): boolean {
  return usuario.rol === ROL_ADMINISTRADOR;
}
