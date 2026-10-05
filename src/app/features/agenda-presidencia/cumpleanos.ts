import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CumpleanosMes,
  CumpleanosService,
  MESES,
  MesCumpleanos,
  ResumenCumpleanos,
} from '../../core/services/cumpleanos.service';

/** Cumpleaños de diputados y gabinete del mes en curso y del siguiente (Laravel: /nacimiento). */
@Component({
  selector: 'app-cumpleanos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cumpleanos.html',
  styleUrl: './cumpleanos.scss',
})
export class Cumpleanos {
  protected readonly resumen = signal<ResumenCumpleanos | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly meses = MESES.map((nombre, i) => ({ numero: i + 1, nombre }));
  protected readonly mesSeleccionado = signal(new Date().getMonth() + 1);

  constructor(
    cumpleanosService: CumpleanosService,
    private readonly router: Router,
  ) {
    cumpleanosService.resumen().subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.mesSeleccionado.set(r.actual.mes);
      },
      error: () => this.error.set('No se pudieron cargar los cumpleaños.'),
    });
  }

  nombreMes(m: CumpleanosMes): string {
    return MESES[m.mes - 1];
  }

  imprimir(mes: MesCumpleanos): void {
    void this.router.navigate(['/presidencia/cumpleanos/imprimir'], { queryParams: { mes } });
  }
}
