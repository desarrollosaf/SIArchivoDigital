import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, QueryTypes, WhereOptions, literal } from 'sequelize';
import { SUsuario } from '../database/models/s-usuario.model';
import { SUsers } from '../database/models/s-users.model';
import { UsersSafs } from '../database/models/users-safs.model';
import { TDepartamento } from '../database/models/t-departamento.model';

export interface PerfilServidor {
  rfc: string;
  nombre: string;
  puesto: string | null;
  idDependencia: number | null;
  idDireccion: number | null;
  idDepartamento: number | null;
  /** Clave presupuestal del departamento (t_departamento.c_presup), base del folio. */
  clavePresupuestal: number | null;
  departamento: string | null;
  rango: number | null;
}

export interface ServidorPublico {
  rfc: string;
  nombre: string;
  puesto: string | null;
}

/**
 * En s_usuario, `Nombre` casi siempre trae ya el nombre completo ("APELLIDOS NOMBRE"), pero en
 * algunos registros los apellidos vienen aparte: se agregan solo si no están ya incluidos.
 */
export function nombreCompleto(u: {
  Nombre: string | null;
  A_Paterno?: string | null;
  A_Materno?: string | null;
}): string {
  const base = (u.Nombre ?? '').trim();
  const apellidos = [u.A_Paterno, u.A_Materno]
    .map((a) => a?.trim())
    .filter(
      (a): a is string => !!a && !base.toUpperCase().includes(a.toUpperCase()),
    );
  return [base, ...apellidos].filter(Boolean).join(' ');
}

/** Consultas al padrón de servidores públicos (base externa adminplem_saf). */
@Injectable()
export class PadronService {
  constructor(
    @InjectModel(SUsuario, 'external')
    private readonly sUsuarioModel: typeof SUsuario,
    @InjectModel(SUsers, 'external')
    private readonly sUsersModel: typeof SUsers,
    @InjectModel(UsersSafs, 'external')
    private readonly usersSafsModel: typeof UsersSafs,
    @InjectModel(TDepartamento, 'external')
    private readonly departamentoModel: typeof TDepartamento,
  ) {}

  /**
   * A quién puede turnar el usuario, con la misma regla que Laravel (RegistroController@index y
   * BusquedasController@turnar), sin las excepciones por RFC que estaban fijas en el código:
   *
   * - Siempre: todo su departamento.
   * - Jefe de departamento: además, rangos 1 a 3 de su misma dirección.
   * - Unidades 40001/40011 (Secretaría y su particular): rangos distintos de 4 en las
   *   direcciones (claves que terminan en 01) y en la 40011.
   * - Los demás: rangos distintos de 4 en las áreas de su misma dirección (mismos dos primeros
   *   dígitos de la clave), en las direcciones (…01), en la 40011 y en la 41001.
   *
   * Todo dentro de su dependencia, solo personas activas y con cuenta vigente para entrar.
   */
  async destinatariosPermitidos(
    rfc: string,
    search?: string,
    limite = 30,
  ): Promise<ServidorPublico[]> {
    const perfil = await this.perfil(rfc);
    if (!perfil?.idDepartamento) return [];

    const clave = String(perfil.clavePresupuestal ?? '');
    const esJefeDepartamento =
      perfil.puesto?.trim().toUpperCase() === 'JEFE DE DEPARTAMENTO';

    let alcance: string;
    if (esJefeDepartamento) {
      alcance =
        '(s.id_Departamento = :depto OR (s.id_Direccion = :direccion AND su.rango IN (1, 2, 3)))';
    } else {
      const areas = ['40001', '40011'].includes(clave)
        ? "(d.c_presup LIKE '%01' OR d.c_presup = 40011)"
        : "(d.c_presup LIKE :prefijo OR d.c_presup LIKE '%01' OR d.c_presup IN (40011, 41001))";
      alcance =
        '(s.id_Departamento = :depto OR (su.rango <> 4 AND s.id_Departamento IN ' +
        `(SELECT d.id_Departamento FROM t_departamento d WHERE d.id_Dependencia = :dependencia AND ${areas})))`;
    }

    const term = search?.trim();
    const filas = await this.sUsuarioModel.sequelize!.query<{
      N_Usuario: string;
      Nombre: string;
      A_Paterno: string | null;
      A_Materno: string | null;
      Puesto: string | null;
    }>(
      'SELECT DISTINCT s.N_Usuario, s.Nombre, s.A_Paterno, s.A_Materno, s.Puesto ' +
        'FROM s_usuario s ' +
        'JOIN users_safs u ON u.rfc = s.N_Usuario AND u.deleted_at IS NULL ' +
        'LEFT JOIN s_users su ON su.username = s.N_Usuario ' +
        'WHERE s.Estado = 1 AND s.id_Dependencia = :dependencia AND ' +
        alcance +
        (term ? ' AND (s.Nombre LIKE :term OR s.N_Usuario LIKE :term)' : '') +
        ' ORDER BY s.Nombre LIMIT :limite',
      {
        type: QueryTypes.SELECT,
        replacements: {
          depto: perfil.idDepartamento,
          direccion: perfil.idDireccion,
          dependencia: perfil.idDependencia,
          prefijo: `${clave.slice(0, 2)}%`,
          term: `%${term}%`,
          limite,
        },
      },
    );
    return filas.map((p) => ({
      rfc: p.N_Usuario,
      nombre: nombreCompleto(p),
      puesto: p.Puesto ?? null,
    }));
  }

  async perfil(rfc: string): Promise<PerfilServidor | null> {
    const persona = await this.sUsuarioModel.findOne({
      where: { N_Usuario: rfc },
    });
    if (!persona) return null;

    const [departamento, cuenta] = await Promise.all([
      persona.id_Departamento
        ? this.departamentoModel.findByPk(persona.id_Departamento)
        : Promise.resolve(null),
      this.sUsersModel.findOne({ where: { username: rfc } }),
    ]);

    return {
      rfc,
      nombre: nombreCompleto(persona),
      puesto: persona.Puesto ?? null,
      idDependencia: persona.id_Dependencia ?? null,
      idDireccion: persona.id_Direccion ?? null,
      idDepartamento: persona.id_Departamento ?? null,
      clavePresupuestal: departamento?.c_presup ?? null,
      departamento:
        departamento?.nombre_completo ?? departamento?.Nombre ?? null,
      rango: cuenta?.rango ?? null,
    };
  }

  async nombresPorRfc(rfcs: string[]): Promise<Map<string, string>> {
    const resultado = new Map<string, string>();
    const unicos = [...new Set(rfcs.filter(Boolean))];
    if (unicos.length === 0) return resultado;

    const personas = await this.sUsuarioModel.findAll({
      where: { N_Usuario: { [Op.in]: unicos } },
    });
    for (const p of personas) {
      resultado.set(p.N_Usuario, nombreCompleto(p));
    }
    return resultado;
  }

  /** `registro.user_registro` guarda `users_safs.id`: lo traduce a RFC y nombre. */
  async usuariosPorId(
    ids: number[],
  ): Promise<Map<number, { rfc: string; nombre: string }>> {
    const resultado = new Map<number, { rfc: string; nombre: string }>();
    const unicos = [...new Set(ids.filter((id) => id != null))];
    if (unicos.length === 0) return resultado;

    const cuentas = await this.usersSafsModel.findAll({
      where: { id: { [Op.in]: unicos } },
      paranoid: false,
    });
    const nombres = await this.nombresPorRfc(cuentas.map((c) => c.rfc));
    for (const c of cuentas) {
      resultado.set(Number(c.id), {
        rfc: c.rfc,
        nombre: nombres.get(c.rfc) ?? c.name ?? c.rfc,
      });
    }
    return resultado;
  }

  /** Servidores públicos activos, opcionalmente de una sola dependencia. */
  async buscar(
    search?: string,
    idDependencia?: number | null,
    limite = 30,
  ): Promise<ServidorPublico[]> {
    const term = search?.trim();
    // Como en Laravel: solo personas activas que además tienen cuenta vigente para entrar al
    // sistema; turnar a alguien sin cuenta dejaría el documento sin quien lo pueda abrir.
    const where: WhereOptions = {
      Estado: 1,
      N_Usuario: {
        [Op.in]: literal(
          '(SELECT rfc FROM users_safs WHERE deleted_at IS NULL AND rfc IS NOT NULL)',
        ),
      },
    };
    if (idDependencia) Object.assign(where, { id_Dependencia: idDependencia });
    if (term) {
      Object.assign(where, {
        [Op.or]: [
          { Nombre: { [Op.like]: `%${term}%` } },
          { N_Usuario: { [Op.like]: `%${term}%` } },
        ],
      });
    }
    const personas = await this.sUsuarioModel.findAll({
      where,
      order: [['Nombre', 'ASC']],
      limit: limite,
    });
    return personas.map((p) => ({
      rfc: p.N_Usuario,
      nombre: nombreCompleto(p),
      puesto: p.Puesto ?? null,
    }));
  }

  /** RFCs cuyo nombre coincide con el término (para buscar registros por remitente). */
  async rfcsPorNombre(term: string): Promise<string[]> {
    const personas = await this.sUsuarioModel.findAll({
      attributes: ['N_Usuario'],
      where: { Nombre: { [Op.like]: `%${term.trim()}%` } },
      limit: 200,
    });
    return personas.map((p) => p.N_Usuario);
  }

  async departamentos(): Promise<
    { id: number; clave: number | null; nombre: string }[]
  > {
    const rows = await this.departamentoModel.findAll({
      where: { Estado: 1 },
      order: [['nombre_completo', 'ASC']],
    });
    return rows.map((d) => ({
      id: d.id_Departamento,
      clave: d.c_presup ?? null,
      nombre: d.nombre_completo ?? d.Nombre,
    }));
  }

  async nombresDepartamentos(ids: number[]): Promise<Map<number, string>> {
    const resultado = new Map<number, string>();
    const unicos = [...new Set(ids.filter((id) => Number.isFinite(id)))];
    if (unicos.length === 0) return resultado;

    const rows = await this.departamentoModel.findAll({
      where: { id_Departamento: { [Op.in]: unicos } },
    });
    for (const d of rows) {
      resultado.set(d.id_Departamento, d.nombre_completo ?? d.Nombre);
    }
    return resultado;
  }
}
