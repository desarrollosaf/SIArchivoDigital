import { Injectable } from '@nestjs/common';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import type {
  CumpleanosMes,
  CumpleGabinete,
} from '../agenda-presidencia/cumpleanos.service';

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

// Mismo diseño que el PDF de Laravel (cumple_pdf.blade.php) y que la hoja de impresión del
// frontend: borgoña #7D1535 y dorado #A07830 sobre el membrete de la Secretaría.
const BORGONA = '#7D1535';
const DORADO = '#A07830';
const ROSA = '#F2E0E5';
const RENGLON_PAR = '#FBF5F7';
const LINEA = '#EDD8DF';
const TINTA = '#2C2C2C';
const GRIS = '#666666';

const ANCHO = 612; // carta, en puntos
const ALTO = 792;
const MARGEN = 51; // ~18 mm
const ALTO_ENCABEZADO = (ANCHO * 1839) / 10200; // proporción de la imagen
const ALTO_PIE = (ANCHO * 552) / 5100;
const COL_DIA = 42;

/** Imágenes del membrete: backend/assets/membrete (se copian a la imagen de Docker). */
const DIR_MEMBRETE = join(__dirname, '..', '..', 'assets', 'membrete');

/** Genera en el servidor el PDF "Cumpleaños <mes>" que se manda por WhatsApp. */
@Injectable()
export class CumpleanosPdfService {
  nombreArchivo(d: CumpleanosMes): string {
    return `cumpleanos_${MESES[d.mes - 1]}_${d.anio}.pdf`;
  }

  titulo(d: CumpleanosMes): string {
    const mes = MESES[d.mes - 1];
    return `Cumpleaños ${mes[0].toUpperCase()}${mes.slice(1)} ${d.anio}`;
  }

  generar(d: CumpleanosMes): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 0,
      info: { Title: this.titulo(d), Author: 'SIArchivoDigital' },
    });
    const partes: Buffer[] = [];
    const listo = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (p: Buffer) => partes.push(p));
      doc.on('end', () => resolve(Buffer.concat(partes)));
      doc.on('error', reject);
    });

    let y = this.membrete(doc);
    const limite = ALTO - ALTO_PIE - 14;
    const ancho = ANCHO - MARGEN * 2;

    /** Pasa a una hoja nueva si lo que sigue no cabe. */
    const espacio = (alto: number) => {
      if (y + alto <= limite) return;
      doc.addPage();
      y = this.membrete(doc);
    };

    // Título
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(BORGONA)
      .text(this.titulo(d).toUpperCase(), MARGEN, y, {
        width: ancho,
        align: 'center',
        characterSpacing: 1,
      });
    y = doc.y + 4;
    doc.rect(ANCHO / 2 - 40, y, 80, 1.6).fill(DORADO);
    y += 14;

    const seccion = (
      titulo: string,
      filas: { dia: number; nombre: string; cargo?: string | null }[],
      conCargo: boolean,
      vacio: string | null,
    ) => {
      if (filas.length === 0 && vacio === null) return;
      espacio(60);
      doc.rect(MARGEN, y, ancho, 18).fill(BORGONA);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#FFFFFF')
        .text(titulo.toUpperCase(), MARGEN + 10, y + 5, {
          characterSpacing: 0.4,
        });
      y += 18;

      if (filas.length === 0) {
        doc.rect(MARGEN, y, ancho, 20).fillAndStroke('#FAFAFA', LINEA);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#999999')
          .text(vacio ?? '', MARGEN, y + 6, { width: ancho, align: 'center' });
        y += 30;
        return;
      }

      const anchoNombre = conCargo ? (ancho - COL_DIA) / 2 : ancho - COL_DIA;
      const xNombre = MARGEN + COL_DIA;
      const xCargo = xNombre + anchoNombre;

      const encabezado = () => {
        doc.rect(MARGEN, y, ancho, 15).fill(ROSA);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(BORGONA);
        doc.text('DÍA', MARGEN, y + 4.5, { width: COL_DIA, align: 'center' });
        doc.text('NOMBRE', xNombre + 8, y + 4.5);
        if (conCargo) doc.text('CARGO', xCargo + 8, y + 4.5);
        y += 15;
      };
      encabezado();

      filas.forEach((f, i) => {
        doc.font('Helvetica-Bold').fontSize(8.5);
        const altoNombre = doc.heightOfString(f.nombre.toUpperCase(), {
          width: anchoNombre - 16,
        });
        doc.font('Helvetica').fontSize(8.5);
        const altoCargo = conCargo
          ? doc.heightOfString(f.cargo ?? '', { width: anchoNombre - 16 })
          : 0;
        const alto = Math.max(20, Math.max(altoNombre, altoCargo) + 10);
        if (y + alto > limite) {
          doc.addPage();
          y = this.membrete(doc);
          encabezado();
        }

        if (i % 2 === 1) doc.rect(MARGEN, y, ancho, alto).fill(RENGLON_PAR);
        doc
          .moveTo(MARGEN, y + alto)
          .lineTo(MARGEN + ancho, y + alto)
          .lineWidth(0.5)
          .stroke(LINEA);

        // Día en una pastilla borgoña
        doc
          .roundedRect(MARGEN + COL_DIA / 2 - 11, y + alto / 2 - 7, 22, 14, 7)
          .fill(BORGONA);
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#FFFFFF')
          .text(String(f.dia), MARGEN + COL_DIA / 2 - 11, y + alto / 2 - 4, {
            width: 22,
            align: 'center',
          });

        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#1A1A1A')
          .text(
            f.nombre.toUpperCase(),
            xNombre + 8,
            y + (alto - altoNombre) / 2,
            {
              width: anchoNombre - 16,
            },
          );
        if (conCargo && f.cargo) {
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor(GRIS)
            .text(f.cargo, xCargo + 8, y + (alto - altoCargo) / 2, {
              width: anchoNombre - 16,
            });
        }
        y += alto;
      });
      y += 12;
    };

    seccion(
      'Diputadas, Diputade y Diputados',
      d.diputados,
      false,
      'No hay diputados con cumpleaños en este período.',
    );
    const grupo = (tipo: 0 | 1) =>
      d.gabinete.filter((g: CumpleGabinete) => g.tipo === tipo);
    seccion('Gobierno del Estado de México', grupo(0), true, null);
    seccion('Congreso del Estado de México', grupo(1), true, null);
    if (d.gabinete.length === 0) {
      seccion(
        'Gabinete',
        [],
        true,
        'No hay miembros del gabinete con cumpleaños en este período.',
      );
    }

    espacio(16);
    const hoy = new Date();
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(DORADO)
      .text(
        `Generado el ${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`,
        MARGEN,
        y,
        { width: ancho, align: 'center' },
      );

    doc.end();
    return listo;
  }

  /** Encabezado y pie del membrete en la hoja actual; regresa dónde empieza el contenido. */
  private membrete(doc: PDFKit.PDFDocument): number {
    doc.image(join(DIR_MEMBRETE, 'encabezado.jpeg'), 0, 0, { width: ANCHO });
    doc.image(join(DIR_MEMBRETE, 'pie.jpeg'), 0, ALTO - ALTO_PIE, {
      width: ANCHO,
    });
    doc.fillColor(TINTA);
    return ALTO_ENCABEZADO + 10;
  }
}
