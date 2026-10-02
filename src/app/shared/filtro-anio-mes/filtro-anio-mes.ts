import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

const MESES = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
];

/** Archivo Digital tiene registros desde 2022 (cuando arrancó el sistema Laravel). */
const ANIO_INICIO = 2022;

@Component({
  selector: 'app-filtro-anio-mes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './filtro-anio-mes.html',
  styleUrl: './filtro-anio-mes.scss',
})
export class FiltroAnioMes {
  readonly anio = input.required<number>();
  readonly mes = input<number | null>(null);

  readonly anioChange = output<number>();
  readonly mesChange = output<number | null>();

  protected readonly meses = MESES;

  // Del año actual hacia atrás hasta ANIO_INICIO (nunca antes, ahí no hay registros): en cuanto
  // el reloj marque el siguiente año, la opción más reciente aparece sola, sin tocar código.
  protected readonly anios = computed(() => {
    const actual = new Date().getFullYear();
    const cantidad = Math.max(1, actual - ANIO_INICIO + 1);
    return Array.from({ length: cantidad }, (_, i) => actual - i);
  });

  onAnioChange(valor: string): void {
    this.anioChange.emit(Number(valor));
  }

  onMesChange(valor: string): void {
    this.mesChange.emit(valor ? Number(valor) : null);
  }
}
