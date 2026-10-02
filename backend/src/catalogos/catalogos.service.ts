import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Serie } from '../database/models/serie.model';
import { Seccion } from '../database/models/seccion.model';
import { SubSerie } from '../database/models/sub-serie.model';
import { Grupo } from '../database/models/grupo.model';
import {
  Modalidad,
  Salon,
  TipoAtencion,
  TipoSolicitud,
} from '../database/models/catalogos-simples.model';
import { PadronService } from '../common/padron.service';

/**
 * Series "virtuales" que Laravel agregaba a mano en el formulario y que no existen en la tabla
 * `series`. 4161 es lo que valía el literal octal 010101 de PHP.
 */
export const SERIE_CORRESPONDENCIA = 999;
export const SERIE_EVENTOS = 4161;
export const SERIES_ESPECIALES = [
  { id: SERIE_CORRESPONDENCIA, nombre: 'CORRESPONDENCIA', horarios: false },
  { id: SERIE_EVENTOS, nombre: 'EVENTOS', horarios: true },
];

/** Prefijo con que viajan los grupos en las listas de destinatarios (los RFC nunca lo llevan). */
export const PREFIJO_GRUPO = 'G:';

export interface Opcion<T = number> {
  id: T;
  nombre: string;
}

@Injectable()
export class CatalogosService {
  constructor(
    @InjectModel(TipoAtencion)
    private readonly tipoAtencionModel: typeof TipoAtencion,
    @InjectModel(TipoSolicitud)
    private readonly tipoSolicitudModel: typeof TipoSolicitud,
    @InjectModel(Salon) private readonly salonModel: typeof Salon,
    @InjectModel(Modalidad) private readonly modalidadModel: typeof Modalidad,
    @InjectModel(Seccion) private readonly seccionModel: typeof Seccion,
    @InjectModel(Serie) private readonly serieModel: typeof Serie,
    @InjectModel(SubSerie) private readonly subSerieModel: typeof SubSerie,
    @InjectModel(Grupo) private readonly grupoModel: typeof Grupo,
    private readonly padron: PadronService,
  ) {}

  async tiposAtencion(): Promise<Opcion[]> {
    const rows = await this.tipoAtencionModel.findAll({
      where: { status: true },
      order: [['id', 'ASC']],
    });
    return rows.map((r) => ({ id: Number(r.id), nombre: r.tipo }));
  }

  async tiposSolicitud(): Promise<Opcion[]> {
    const rows = await this.tipoSolicitudModel.findAll({
      order: [['id', 'ASC']],
    });
    return rows.map((r) => ({ id: r.id, nombre: r.tipo ?? '' }));
  }

  async salones(): Promise<(Opcion & { color: string | null })[]> {
    const rows = await this.salonModel.findAll({ order: [['salon', 'ASC']] });
    return rows.map((r) => ({
      id: r.id,
      nombre: r.salon ?? '',
      color: r.color,
    }));
  }

  async modalidades(): Promise<Opcion[]> {
    const rows = await this.modalidadModel.findAll({ order: [['id', 'ASC']] });
    return rows.map((r) => ({ id: r.id, nombre: r.modalidad ?? '' }));
  }

  /** Series activas del departamento del usuario, más las dos series especiales. */
  async seriesParaRegistro(
    rfc: string,
  ): Promise<(Opcion & { horarios: boolean })[]> {
    const perfil = await this.padron.perfil(rfc);
    const propias = perfil?.idDepartamento
      ? await this.serieModel.findAll({
          where: { departamentoId: perfil.idDepartamento, status: true },
          order: [['serie', 'ASC']],
        })
      : [];
    return [
      ...SERIES_ESPECIALES,
      ...propias.map((s) => ({
        id: Number(s.id),
        nombre: s.serie,
        horarios: !!s.horarios,
      })),
    ];
  }

  /** Nombre visible de una serie, contemplando las especiales. */
  async nombresSeries(ids: number[]): Promise<Map<number, string>> {
    const resultado = new Map<number, string>(
      SERIES_ESPECIALES.map((s) => [s.id, s.nombre]),
    );
    const reales = [...new Set(ids)].filter((id) => !resultado.has(id));
    if (reales.length) {
      const rows = await this.serieModel.findAll({
        where: { id: { [Op.in]: reales } },
      });
      rows.forEach((s) => resultado.set(Number(s.id), s.serie));
    }
    return resultado;
  }

  /** Secciones activas del departamento del usuario (para clasificar al concluir un turno). */
  async seccionesDelUsuario(
    rfc: string,
  ): Promise<(Opcion & { codigo: string })[]> {
    const perfil = await this.padron.perfil(rfc);
    if (!perfil?.idDepartamento) return [];
    const rows = await this.seccionModel.findAll({
      where: { departamentoId: String(perfil.idDepartamento), status: true },
      order: [['codigo', 'ASC']],
    });
    return rows.map((s) => ({
      id: Number(s.id),
      codigo: s.codigo,
      nombre: s.seccion,
    }));
  }

  async seriesDeSeccion(
    idSeccion: number,
  ): Promise<(Opcion & { codigo: string })[]> {
    const rows = await this.serieModel.findAll({
      where: { idSeccion, status: true },
      order: [['codigo', 'ASC']],
    });
    return rows.map((s) => ({
      id: Number(s.id),
      codigo: s.codigo,
      nombre: s.serie,
    }));
  }

  async subseriesDeSerie(
    idSerie: number,
  ): Promise<(Opcion & { codigo: string })[]> {
    const rows = await this.subSerieModel.findAll({
      where: { idSerie, status: true },
      order: [['codigo', 'ASC']],
    });
    return rows.map((s) => ({
      id: Number(s.id),
      codigo: s.codigo,
      nombre: s.subserie,
    }));
  }

  async servidoresPublicos(search?: string) {
    const rows = await this.padron.buscar(search);
    return rows.map((r) => ({
      id: r.rfc,
      nombre: r.nombre,
      detalle: r.puesto,
    }));
  }

  /**
   * A quién se puede turnar: las personas que permite la regla de Laravel según el área y rango
   * del usuario (ver PadronService.destinatariosPermitidos), más los grupos activos ("G:<id>").
   */
  async destinatarios(rfc: string, search?: string) {
    const term = search?.trim();
    const [personas, grupos] = await Promise.all([
      this.padron.destinatariosPermitidos(rfc, term),
      this.grupoModel.findAll({
        where: term
          ? { activo: true, grupo: { [Op.like]: `%${term}%` } }
          : { activo: true },
        order: [['grupo', 'ASC']],
        limit: 10,
      }),
    ]);
    return [
      ...grupos.map((g) => ({
        id: `${PREFIJO_GRUPO}${g.id}`,
        nombre: `Grupo: ${g.grupo}`,
        detalle: null,
      })),
      ...personas.map((p) => ({
        id: p.rfc,
        nombre: p.nombre,
        detalle: p.puesto,
      })),
    ];
  }

  departamentos() {
    return this.padron.departamentos();
  }
}
