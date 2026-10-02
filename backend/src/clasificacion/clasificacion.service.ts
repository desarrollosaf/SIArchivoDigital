import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Seccion } from '../database/models/seccion.model';
import { Serie } from '../database/models/serie.model';
import { SubSerie } from '../database/models/sub-serie.model';
import { PadronService } from '../common/padron.service';
import { SeccionDto, SerieDto, SubSerieDto } from './dto/clasificacion.dto';

/** Administración del cuadro de clasificación archivística: secciones > series > subseries. */
@Injectable()
export class ClasificacionService {
  constructor(
    @InjectModel(Seccion) private readonly seccionModel: typeof Seccion,
    @InjectModel(Serie) private readonly serieModel: typeof Serie,
    @InjectModel(SubSerie) private readonly subSerieModel: typeof SubSerie,
    private readonly padron: PadronService,
  ) {}

  async secciones() {
    const [secciones, conteos] = await Promise.all([
      this.seccionModel.findAll({
        order: [
          ['codigo', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.serieModel.count({ group: ['idSeccion'] }),
    ]);
    const departamentos = await this.padron.nombresDepartamentos(
      secciones.map((s) => Number(s.departamentoId)),
    );
    const seriesPorSeccion = this.conteoPorPadre(conteos, 'idSeccion');
    return secciones.map((s) => ({
      id: Number(s.id),
      codigo: s.codigo,
      seccion: s.seccion,
      departamentoId: Number(s.departamentoId),
      departamento:
        departamentos.get(Number(s.departamentoId)) ??
        `Departamento ${s.departamentoId}`,
      activo: !!s.status,
      series: seriesPorSeccion.get(Number(s.id)) ?? 0,
    }));
  }

  async crearSeccion(dto: SeccionDto) {
    const s = await this.seccionModel.create({
      ...dto,
      departamentoId: String(dto.departamentoId),
      status: true,
    });
    return { id: Number(s.id) };
  }

  async editarSeccion(id: number, dto: SeccionDto) {
    const s = await this.seccion(id);
    await s.update({ ...dto, departamentoId: String(dto.departamentoId) });
  }

  async alternarSeccion(id: number) {
    const s = await this.seccion(id);
    await s.update({ status: !s.status });
  }

  async seriesDeSeccion(idSeccion: number) {
    const [series, conteos] = await Promise.all([
      this.serieModel.findAll({
        where: { idSeccion },
        order: [
          ['codigo', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      this.subSerieModel.count({ group: ['idSerie'] }),
    ]);
    const subseriesPorSerie = this.conteoPorPadre(conteos, 'idSerie');
    return series.map((s) => ({
      id: Number(s.id),
      idSeccion: s.idSeccion,
      codigo: s.codigo,
      serie: s.serie,
      horarios: !!s.horarios,
      duracionSistema: s.duracionSistema,
      activo: !!s.status,
      subseries: subseriesPorSerie.get(Number(s.id)) ?? 0,
    }));
  }

  async crearSerie(dto: SerieDto) {
    const seccion = await this.seccion(dto.idSeccion);
    const s = await this.serieModel.create({
      idSeccion: dto.idSeccion,
      codigo: dto.codigo,
      serie: dto.serie,
      horarios: dto.horarios ?? false,
      duracionSistema: dto.duracionSistema ?? 730,
      departamentoId: Number(seccion.departamentoId),
      status: true,
    });
    return { id: Number(s.id) };
  }

  async editarSerie(id: number, dto: SerieDto) {
    const s = await this.serie(id);
    await s.update({
      codigo: dto.codigo,
      serie: dto.serie,
      horarios: dto.horarios ?? s.horarios,
      duracionSistema: dto.duracionSistema ?? s.duracionSistema,
    });
  }

  async alternarSerie(id: number) {
    const s = await this.serie(id);
    await s.update({ status: !s.status });
  }

  async subseriesDeSerie(idSerie: number) {
    const rows = await this.subSerieModel.findAll({
      where: { idSerie },
      order: [
        ['codigo', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return rows.map((s) => ({
      id: Number(s.id),
      idSerie: s.idSerie,
      codigo: s.codigo,
      subserie: s.subserie,
      activo: !!s.status,
    }));
  }

  async crearSubserie(dto: SubSerieDto) {
    await this.serie(dto.idSerie);
    const s = await this.subSerieModel.create({ ...dto, status: true });
    return { id: Number(s.id) };
  }

  async editarSubserie(id: number, dto: SubSerieDto) {
    const s = await this.subserie(id);
    await s.update({ codigo: dto.codigo, subserie: dto.subserie });
  }

  async alternarSubserie(id: number) {
    const s = await this.subserie(id);
    await s.update({ status: !s.status });
  }

  private async seccion(id: number): Promise<Seccion> {
    const fila = await this.seccionModel.findByPk(id);
    if (!fila) throw new NotFoundException('La sección no existe');
    return fila;
  }

  private async serie(id: number): Promise<Serie> {
    const fila = await this.serieModel.findByPk(id);
    if (!fila) throw new NotFoundException('La serie no existe');
    return fila;
  }

  private async subserie(id: number): Promise<SubSerie> {
    const fila = await this.subSerieModel.findByPk(id);
    if (!fila) throw new NotFoundException('La subserie no existe');
    return fila;
  }

  /** Cuántas filas hay por cada valor de la llave padre (series por sección, subseries por serie). */
  private conteoPorPadre(
    filas: { [clave: string]: unknown; count: number }[],
    campo: string,
  ) {
    return new Map(filas.map((f) => [Number(f[campo]), Number(f.count)]));
  }
}
