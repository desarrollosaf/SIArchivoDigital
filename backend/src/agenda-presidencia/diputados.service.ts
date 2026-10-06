import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { ComisionLegislativo } from '../database/models/comision-legislativo.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { nacimientoDesdeRfc } from './cumpleanos.service';

/** Las fotos de diputados viven en el portal del Legislativo; la base guarda la ruta relativa. */
const URL_PORTAL = 'https://legislativoedomex.gob.mx/';
const TIPO_FOTO_DIPUTADO = 'App\\Models\\Diputado';

interface FilaDiputado {
  id: string;
  nombres: string | null;
  apaterno: string | null;
  amaterno: string | null;
  descripcion: string | null;
  email: string | null;
  ext: string | null;
  telefono: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  link_web: string | null;
  genero: string | null;
  foto: string | null;
  partido: string | null;
  partidoNombre: string | null;
  distrito: string | null;
  cabecera: string | null;
  integranteId: string | null;
}

/**
 * Ficha de diputados (Laravel: IntegrantesController@index y @getInfo). Se lee de la base del
 * Legislativo (adminplem_congresoedomex) y la fecha de nacimiento se toma del RFC del padrón.
 */
@Injectable()
export class DiputadosService {
  constructor(
    @InjectModel(ComisionLegislativo, 'legislativo')
    private readonly comisionModel: typeof ComisionLegislativo,
    @InjectModel(SUsuario, 'external')
    private readonly sUsuarioModel: typeof SUsuario,
  ) {}

  private get db() {
    return this.comisionModel.sequelize!;
  }

  async listar() {
    const filas = await this.db.query<{
      id: string;
      nombres: string | null;
      apaterno: string | null;
      amaterno: string | null;
      partido: string | null;
      distrito: string | null;
    }>(
      // El portal tiene a algunas personas dos veces (p. ej. tras cambiar de partido): el
      // partido y el distrito ayudan a distinguirlas.
      `SELECT d.id, d.nombres, d.apaterno, d.amaterno, p.siglas AS partido, di.distrito
         FROM diputados d
         LEFT JOIN integrante_legislaturas il ON il.id = (
              SELECT il2.id FROM integrante_legislaturas il2
               WHERE il2.diputado_id = d.id ORDER BY il2.created_at DESC LIMIT 1)
         LEFT JOIN partidos p ON p.id = il.partido_id
         LEFT JOIN distritos di ON di.id = il.distrito_id
        WHERE d.deleted_at IS NULL
        ORDER BY d.nombres, d.apaterno, d.amaterno`,
      { type: QueryTypes.SELECT },
    );
    return filas.map((d) => ({
      id: d.id,
      nombre: unir(d.nombres, d.apaterno, d.amaterno),
      partido: d.partido,
      distrito: d.distrito,
    }));
  }

  async ficha(id: string) {
    // Como en Laravel (withTrashed): la integración a la legislatura más reciente, aunque ya
    // haya concluido.
    const [d] = await this.db.query<FilaDiputado>(
      `SELECT d.id, d.nombres, d.apaterno, d.amaterno, d.descripcion, d.email, d.ext, d.telefono,
              d.facebook, d.twitter, d.instagram, d.link_web, g.genero,
              (SELECT f.path FROM fotos f
                WHERE f.fotoable_id = d.id AND f.fotoable_type = :tipoFoto AND f.deleted_at IS NULL
                ORDER BY f.created_at DESC LIMIT 1) AS foto,
              p.siglas AS partido, p.nombre AS partidoNombre,
              di.distrito, m.cabecera, il.id AS integranteId
         FROM diputados d
         LEFT JOIN genders g ON g.id = d.gender_id
         LEFT JOIN integrante_legislaturas il ON il.id = (
              SELECT il2.id FROM integrante_legislaturas il2
               WHERE il2.diputado_id = d.id ORDER BY il2.created_at DESC LIMIT 1)
         LEFT JOIN partidos p ON p.id = il.partido_id
         LEFT JOIN distritos di ON di.id = il.distrito_id
         LEFT JOIN municipios m ON m.id = di.municipio_id
        WHERE d.id = :id AND d.deleted_at IS NULL`,
      {
        type: QueryTypes.SELECT,
        replacements: { id, tipoFoto: TIPO_FOTO_DIPUTADO },
      },
    );
    if (!d) throw new NotFoundException('No se encontró al diputado.');

    const comisiones = d.integranteId
      ? await this.db.query<{ comision: string; cargo: string | null }>(
          `SELECT c.nombre AS comision, t.valor AS cargo
             FROM integrante_comisions ic
             JOIN comisions c ON c.id = ic.comision_id
             LEFT JOIN tipo_cargo_comisions t ON t.id = ic.tipo_cargo_comision_id
            WHERE ic.integrante_legislatura_id = :integrante AND ic.deleted_at IS NULL
            ORDER BY t.nivel, c.nombre`,
          {
            type: QueryTypes.SELECT,
            replacements: { integrante: d.integranteId },
          },
        )
      : [];

    return {
      id: d.id,
      nombre: unir(d.nombres, d.apaterno, d.amaterno),
      tratamiento:
        d.genero === 'Femenino'
          ? 'Diputada'
          : d.genero === 'Masculino'
            ? 'Diputado'
            : 'Diputade',
      foto: d.foto ? URL_PORTAL + d.foto.replace(/^\/+/, '') : null,
      partido: d.partido,
      partidoNombre: d.partidoNombre,
      distrito: d.distrito,
      cabecera: d.cabecera,
      descripcion: d.descripcion,
      email: d.email,
      ext: d.ext,
      telefono: d.telefono,
      redes: {
        facebook: red(d.facebook, 'https://facebook.com/'),
        twitter: red(d.twitter, 'https://twitter.com/'),
        instagram: red(d.instagram, 'https://instagram.com/'),
        web: red(d.link_web, ''),
      },
      nacimiento: await this.nacimiento(d),
      comisiones,
    };
  }

  /** En el padrón el legislador está como "APATERNO AMATERNO NOMBRES" (igual que en Laravel). */
  private async nacimiento(d: FilaDiputado) {
    const nombre = unir(d.apaterno, d.amaterno, d.nombres);
    if (!nombre) return null;
    const persona = await this.sUsuarioModel.findOne({
      attributes: ['N_Usuario'],
      where: { Nombre: nombre },
    });
    const n = nacimientoDesdeRfc(persona?.N_Usuario ?? null);
    if (!n) return null;
    return `${n.anio}-${String(n.mes).padStart(2, '0')}-${String(n.dia).padStart(2, '0')}`;
  }
}

function unir(...partes: (string | null)[]): string {
  return partes
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ');
}

/** Laravel solo mostraba la red si traía algo más que un carácter. */
function red(valor: string | null, base: string): string | null {
  const v = valor?.trim();
  if (!v || v.length < 2) return null;
  return /^https?:\/\//i.test(v) ? v : base + v.replace(/^@/, '');
}
