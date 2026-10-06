import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron } from '@nestjs/schedule';
import { UniqueConstraintError } from 'sequelize';
import { WhatsappDestinatario } from '../database/models/whatsapp-destinatario.model';
import { CumpleanosService } from '../agenda-presidencia/cumpleanos.service';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { CumpleanosPdfService } from './cumpleanos-pdf.service';
import { ResultadoEnvio, WhatsappService } from './whatsapp.service';

const ZONA = 'America/Mexico_City';
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export type MesPdf = 'actual' | 'siguiente';

/**
 * Avisos de cumpleaños por WhatsApp a los teléfonos de Administración → Avisos por WhatsApp
 * (en Laravel: comandos recordatorio:cumple y cumple:pdf-email del Kernel).
 *
 * - Cumpleaños del día: a las 5, 7 y 17 h, como en Laravel.
 * - PDF del mes: el día 1 (mes en curso) y dos días antes de que empiece el mes (mes siguiente),
 *   a las 8 h. Laravel tenía además una corrida a las 5 h del día 1 que lo mandaba repetido.
 */
@Injectable()
export class AvisosCumpleanosService {
  private readonly logger = new Logger(AvisosCumpleanosService.name);

  constructor(
    @InjectModel(WhatsappDestinatario)
    private readonly destinatarioModel: typeof WhatsappDestinatario,
    private readonly cumpleanos: CumpleanosService,
    private readonly pdf: CumpleanosPdfService,
    private readonly whatsapp: WhatsappService,
  ) {}

  // ---- Tareas programadas ----------------------------------------------------------------

  @Cron('0 5,7,17 * * *', { name: 'cumpleanos-del-dia', timeZone: ZONA })
  async tareaDelDia() {
    if (!this.whatsapp.puedeEnviar()) return;
    await this.ejecutar('cumpleaños del día', () => this.enviarDelDia());
  }

  @Cron('0 8 * * *', { name: 'cumpleanos-pdf-mes', timeZone: ZONA })
  async tareaPdf() {
    if (!this.whatsapp.puedeEnviar()) return;
    const mes = mesPdfQueToca(fechaHoyMexico());
    if (!mes) return;
    await this.ejecutar(`PDF de cumpleaños (${mes})`, () =>
      this.enviarPdf(mes),
    );
  }

  // ---- Mensajes --------------------------------------------------------------------------

  /** Texto del aviso de hoy; null si nadie cumple años. */
  async mensajeDelDia(): Promise<string | null> {
    const hoy = await this.cumpleanos.delDia();
    const personas = [
      ...hoy.diputados.map((d) => ({
        nombre: d.nombre,
        cargo: 'Diputada(o) local',
      })),
      ...hoy.gabinete.map((g) => ({ nombre: g.nombre, cargo: g.cargo })),
    ];
    if (personas.length === 0) return null;
    const [anio, mes, dia] = hoy.fecha.split('-').map(Number);
    const lineas = [
      `*Cumpleaños del día ${dia} de ${MESES[mes - 1]} de ${anio}*`,
      '',
      'Hoy se celebra a:',
      ...personas.flatMap((p) => [
        '',
        `• *${p.nombre}*`,
        ...(p.cargo ? [`  ${p.cargo}`] : []),
      ]),
    ];
    return lineas.join('\n');
  }

  async enviarDelDia() {
    const mensaje = await this.mensajeDelDia();
    if (!mensaje)
      return {
        enviado: false,
        motivo: 'Hoy nadie cumple años.',
        resultados: [],
      };
    const resultados = await this.aTodos((tel) =>
      this.whatsapp.enviarTexto(tel, mensaje),
    );
    return { enviado: true, resultados };
  }

  async generarPdf(mes: string) {
    const datos = await this.cumpleanos.mes(mes, true);
    return {
      archivo: await this.pdf.generar(datos),
      nombre: this.pdf.nombreArchivo(datos),
      titulo: this.pdf.titulo(datos),
    };
  }

  async enviarPdf(mes: MesPdf) {
    const { archivo, nombre, titulo } = await this.generarPdf(mes);
    const resultados = await this.aTodos((tel) =>
      this.whatsapp.enviarDocumento(tel, archivo, nombre, titulo),
    );
    return { enviado: true, resultados };
  }

  // ---- Destinatarios ---------------------------------------------------------------------

  async destinatarios() {
    const filas = await this.destinatarioModel.findAll({
      order: [['nombre', 'ASC']],
    });
    return filas.map((d) => ({
      id: Number(d.id),
      nombre: d.nombre,
      telefono: d.telefono,
      activo: !!d.activo,
    }));
  }

  async guardarDestinatario(
    id: number | null,
    datos: { nombre: string; telefono: string; activo: boolean },
  ) {
    try {
      if (id === null) {
        await this.destinatarioModel.create(datos);
      } else {
        const d = await this.destinatarioModel.findByPk(id);
        if (!d) throw new NotFoundException('No se encontró el teléfono.');
        await d.update(datos);
      }
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        throw new ConflictException('Ese teléfono ya está en la lista.');
      }
      throw e;
    }
    return this.destinatarios();
  }

  async eliminarDestinatario(id: number) {
    const d = await this.destinatarioModel.findByPk(id);
    if (!d) throw new NotFoundException('No se encontró el teléfono.');
    await d.destroy();
    return this.destinatarios();
  }

  // ---- Apoyo -----------------------------------------------------------------------------

  /** Para envíos manuales desde la pantalla: explica por qué no se puede. */
  validarEnvioManual() {
    const e = this.whatsapp.estado();
    if (!e.configurado) {
      throw new BadRequestException(
        'Falta configurar ULTRAMSG_INSTANCIA y ULTRAMSG_TOKEN en el .env del backend.',
      );
    }
    if (!e.activo) {
      throw new BadRequestException(
        'El envío está desactivado (WHATSAPP_ACTIVO=false en el .env del backend).',
      );
    }
  }

  private async aTodos(
    enviar: (telefono: string) => Promise<ResultadoEnvio>,
  ): Promise<ResultadoEnvio[]> {
    const activos = await this.destinatarioModel.findAll({
      where: { activo: true },
    });
    const resultados: ResultadoEnvio[] = [];
    // Uno por uno, como Laravel: el proveedor limita los envíos simultáneos.
    for (const d of activos) resultados.push(await enviar(d.telefono));
    return resultados;
  }

  private async ejecutar(
    nombre: string,
    tarea: () => Promise<{ enviado: boolean; resultados: ResultadoEnvio[] }>,
  ) {
    try {
      const r = await tarea();
      const ok = r.resultados.filter((x) => x.ok).length;
      this.logger.log(
        r.enviado
          ? `Aviso de ${nombre}: ${ok}/${r.resultados.length} enviados`
          : `Aviso de ${nombre}: nada que enviar`,
      );
    } catch (e) {
      this.logger.error(
        `Falló el aviso de ${nombre}`,
        e instanceof Error ? e.stack : String(e),
      );
    }
  }
}

/**
 * Qué PDF toca enviar en la fecha dada (YYYY-MM-DD): el del mes en curso el día 1, el del mes
 * siguiente cuando faltan dos días para que empiece; null cualquier otro día.
 */
export function mesPdfQueToca(fecha: string): MesPdf | null {
  const [a, m, d] = fecha.split('-').map(Number);
  if (d === 1) return 'actual';
  const enDosDias = new Date(Date.UTC(a, m - 1, d + 2));
  return enDosDias.getUTCDate() === 1 ? 'siguiente' : null;
}
