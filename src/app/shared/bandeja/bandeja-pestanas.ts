import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResumenTurnos, TurnosService } from '../../core/services/turnos.service';
import { Icono } from '../icono/icono';

/** Encabezado "Bandeja" con las pestañas Recibidos / Enviados (como en SIIntranetD). */
@Component({
  selector: 'app-bandeja-pestanas',
  standalone: true,
  imports: [RouterLink, Icono],
  template: `
    <div class="page-head">
      <h2><app-icono name="bandeja" /> Bandeja</h2>
      <p>Documentos que ha recibido y enviado.</p>
    </div>
    <div class="subtabs">
      <a class="subtab" [class.on]="activa() === 'recibidos'" routerLink="/entrada">
        <app-icono name="entrada" /> Recibidos
        @if (resumen()?.sinLeer) {
          <span class="pill-count" title="Sin abrir">{{ resumen()!.sinLeer }}</span>
        }
      </a>
      <a class="subtab" [class.on]="activa() === 'enviados'" routerLink="/salida">
        <app-icono name="salida" /> Enviados
        @if (resumen(); as r) {
          <span class="pill-count neutro" title="Documentos registrados pendientes (todos los años)">{{ r.misPendientes }}</span>
        }
      </a>
    </div>
  `,
})
export class BandejaPestanas {
  readonly activa = input.required<'recibidos' | 'enviados'>();
  protected readonly resumen = signal<ResumenTurnos | null>(null);

  constructor(turnosService: TurnosService) {
    turnosService.resumen().subscribe({ next: (r) => this.resumen.set(r), error: () => undefined });
  }
}
