import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { nombreCompleto } from '../common/padron.service';
import { fechaHoyMexico } from '../common/fecha-mexico.util';

/** 0 = Gobierno del Estado de México, 1 = Congreso del Estado de México. */
export type TipoGabinete = 0 | 1;

export interface CumpleDiputado {
  nombre: string;
  dia: number;
}

export interface CumpleGabinete {
  nombre: string;
  cargo: string | null;
  dia: number;
  tipo: TipoGabinete;
}

export interface CumpleanosMes {
  anio: number;
  /** 1 a 12. */
  mes: number;
  diputados: CumpleDiputado[];
  gabinete: CumpleGabinete[];
}

/** Cargos que Laravel dejaba fuera del PDF (registros de apoyo, no del gabinete). */
const CARGOS_EXCLUIDOS_PDF = ['JUCOPO', '-'];

/**
 * "Cumpleaños del mes" (IntegrantesController@cumple y @cumplePdf de Laravel).
 *
 * - Diputados: legisladores activos del padrón (s_usuario, Puesto = LEGISLADOR). No hay fecha de
 *   nacimiento capturada: se toma de los últimos 6 caracteres de N_Usuario (RFC sin homoclave,
 *   AAMMDD), igual que en Laravel.
 * - Gabinete: tabla heredada `pumpes_gabinetes`.
 */
@Injectable()
export class CumpleanosService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    @InjectModel(SUsuario, 'external')
    private readonly sUsuarioModel: typeof SUsuario,
  ) {}

  /**
   * Lo que muestra la pantalla: el mes en curso desde hoy en adelante y el mes siguiente
   * completo.
   */
  async resumen() {
    const [anio, mes, dia] = fechaHoyMexico().split('-').map(Number);
    const siguiente =
      mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
    const [diputados, actual, proximo] = await Promise.all([
      this.legisladores(),
      this.gabinete(mes, false),
      this.gabinete(siguiente.mes, false),
    ]);
    return {
      actual: {
        anio,
        mes,
        diputados: diputadosDelMes(diputados, mes).filter((d) => d.dia >= dia),
        gabinete: actual.filter((g) => g.dia >= dia),
      } satisfies CumpleanosMes,
      siguiente: {
        ...siguiente,
        diputados: diputadosDelMes(diputados, siguiente.mes),
        gabinete: proximo,
      } satisfies CumpleanosMes,
    };
  }

  /**
   * Mes completo para el PDF. `mes` es "actual", "siguiente" o un número de 1 a 12; un mes que
   * ya pasó este año se toma del año siguiente. `todoElGabinete`: sin excluir cargos (el PDF que
   * Laravel mandaba por WhatsApp sí incluía a JUCOPO; el de la pantalla no).
   */
  async mes(mes: string, todoElGabinete = false): Promise<CumpleanosMes> {
    const [anioHoy, mesHoy] = fechaHoyMexico().split('-').map(Number);
    let anio = anioHoy;
    let numero: number;
    if (mes === 'actual') {
      numero = mesHoy;
    } else if (mes === 'siguiente') {
      numero = mesHoy === 12 ? 1 : mesHoy + 1;
      if (numero === 1) anio++;
    } else {
      numero = Number(mes);
      if (!Number.isInteger(numero) || numero < 1 || numero > 12) {
        throw new BadRequestException('Mes inválido.');
      }
      if (numero < mesHoy) anio++;
    }

    const [diputados, gabinete] = await Promise.all([
      this.legisladores(),
      this.gabinete(numero, !todoElGabinete),
    ]);
    return {
      anio,
      mes: numero,
      diputados: diputadosDelMes(diputados, numero),
      gabinete,
    };
  }

  /**
   * Quienes cumplen años hoy (aviso diario por WhatsApp). Como el recordatorio de Laravel
   * (CumpleTask), incluye a todo el gabinete, sin excluir cargos.
   */
  async delDia() {
    const hoy = fechaHoyMexico();
    const [, mes, dia] = hoy.split('-').map(Number);
    const [diputados, gabinete] = await Promise.all([
      this.legisladores(),
      this.gabinete(mes, false),
    ]);
    return {
      fecha: hoy,
      diputados: diputadosDelMes(diputados, mes).filter((d) => d.dia === dia),
      gabinete: gabinete.filter((g) => g.dia === dia),
    };
  }

  private async legisladores() {
    const filas = await this.sUsuarioModel.findAll({
      attributes: ['N_Usuario', 'Nombre', 'A_Paterno', 'A_Materno'],
      where: { Puesto: 'LEGISLADOR', Estado: 1 },
      raw: true,
    });
    return filas.flatMap((u) => {
      const nacimiento = nacimientoDesdeRfc(u.N_Usuario);
      return nacimiento ? [{ nombre: nombreCompleto(u), ...nacimiento }] : [];
    });
  }

  private async gabinete(
    mes: number,
    excluirCargos: boolean,
  ): Promise<CumpleGabinete[]> {
    const filas = await this.registroModel.sequelize!.query<{
      nombre: string | null;
      cargo: string | null;
      dia: number;
      tipo: number | null;
    }>(
      'SELECT nombre, cargo, DAY(fecha_nacimiento) AS dia, tipo FROM pumpes_gabinetes ' +
        'WHERE deleted_at IS NULL AND MONTH(fecha_nacimiento) = :mes' +
        (excluirCargos
          ? ' AND (cargo IS NULL OR cargo NOT IN (:excluidos))'
          : '') +
        ' ORDER BY DAY(fecha_nacimiento), nombre',
      {
        type: QueryTypes.SELECT,
        replacements: { mes, excluidos: CARGOS_EXCLUIDOS_PDF },
      },
    );
    return filas.map((g) => ({
      nombre: (g.nombre ?? '').trim(),
      cargo: g.cargo?.trim() || null,
      dia: Number(g.dia),
      tipo: Number(g.tipo) === 1 ? 1 : 0,
    }));
  }
}

function diputadosDelMes(
  diputados: { nombre: string; mes: number; dia: number }[],
  mes: number,
): CumpleDiputado[] {
  return diputados
    .filter((d) => d.mes === mes)
    .sort((a, b) => a.dia - b.dia || a.nombre.localeCompare(b.nombre))
    .map(({ nombre, dia }) => ({ nombre, dia }));
}

/** "XXXX800424" -> { mes: 4, dia: 24 }; null si los últimos 6 caracteres no son una fecha. */
export function nacimientoDesdeRfc(
  rfc: string | null,
): { anio: number; mes: number; dia: number } | null {
  const m = /(\d{2})(\d{2})(\d{2})$/.exec((rfc ?? '').trim());
  if (!m) return null;
  const yy = Number(m[1]);
  const anio = (yy > 50 ? 1900 : 2000) + yy;
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia)
    return null;
  return { anio, mes, dia };
}
