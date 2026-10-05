import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CumpleanosMes,
  CumpleanosService,
  MESES,
  MesCumpleanos,
} from '../../core/services/cumpleanos.service';

/**
 * Cumpleaños de un mes con el membrete de la Secretaría, lista para imprimir o guardar como PDF
 * desde el navegador (en Laravel se generaba con DomPDF).
 */
@Component({
  selector: 'app-cumpleanos-imprimir',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cumpleanos-imprimir.html',
  styleUrl: './cumpleanos-imprimir.scss',
})
export class CumpleanosImprimir {
  protected readonly datos = signal<CumpleanosMes | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly gobierno = computed(() =>
    (this.datos()?.gabinete ?? []).filter((g) => g.tipo === 0),
  );
  protected readonly congreso = computed(() =>
    (this.datos()?.gabinete ?? []).filter((g) => g.tipo === 1),
  );
  protected readonly generado = (() => {
    const hoy = new Date();
    return `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  })();

  constructor(cumpleanosService: CumpleanosService, route: ActivatedRoute) {
    const q = route.snapshot.queryParamMap.get('mes') ?? 'actual';
    const mes: MesCumpleanos = q === 'actual' || q === 'siguiente' ? q : Number(q);
    cumpleanosService.mes(mes).subscribe({
      next: (d) => this.datos.set(d),
      error: () => this.error.set('No se pudo generar el reporte de cumpleaños.'),
    });
  }

  titulo(d: CumpleanosMes): string {
    return `Cumpleaños ${MESES[d.mes - 1]} ${d.anio}`;
  }

  imprimir(): void {
    window.print();
  }
}
