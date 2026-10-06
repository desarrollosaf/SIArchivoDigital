import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RegistroDetalle, RegistrosService } from '../../core/services/registros.service';
import { fechaCorta } from '../../shared/estatus/estatus';

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

/** Remitente externo (otra institución): el nombre viene en `otroRemitente`. */
const REMITENTE_EXTERNO = '999';

/**
 * Volante "Control de asuntos" de un registro, para imprimir o guardar como PDF desde el
 * navegador (Laravel: getTurno, con DomPDF). Como allá, salen dos tantos en la hoja; quien tiene
 * el rol de Presidencia lo imprime con el membrete de la Junta de Coordinación Política.
 */
@Component({
  selector: 'app-turno-imprimir',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './turno-imprimir.html',
  styleUrl: './turno-imprimir.scss',
})
export class TurnoImprimir {
  protected readonly registro = signal<RegistroDetalle | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly id: number;
  protected readonly tantos = [1, 2];
  protected readonly fechaCorta = fechaCorta;
  protected readonly presidencia: boolean;
  protected readonly fechaHoy = (() => {
    const hoy = new Date();
    return `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  })();

  protected readonly remitente = computed(() => {
    const r = this.registro();
    if (!r) return '';
    return r.remitente.rfc === REMITENTE_EXTERNO
      ? (r.otroRemitente ?? 'Remitente externo')
      : r.remitente.nombre;
  });
  protected readonly turnos = computed(() =>
    (this.registro()?.turnos ?? []).filter((t) => t.activo),
  );

  constructor(registrosService: RegistrosService, authService: AuthService, route: ActivatedRoute) {
    this.id = Number(route.snapshot.paramMap.get('id'));
    this.presidencia = authService.currentUser()?.rol === 'presidencia';
    registrosService.detalle(this.id).subscribe({
      next: (r) => this.registro.set(r),
      error: () => this.error.set('No se pudo cargar el registro.'),
    });
  }

  imprimir(): void {
    window.print();
  }
}
