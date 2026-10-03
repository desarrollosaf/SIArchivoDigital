import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  RegistroDetalle,
  RegistrosService,
  TurnoDetalle,
} from '../../core/services/registros.service';
import { ToastService } from '../../core/services/toast.service';
import { abrirArchivo } from '../abrir-archivo';
import { fechaCorta } from '../estatus/estatus';
import { Icono } from '../icono/icono';
import { clasePrioridad, colorAvatar, fechaHora, iniciales } from './bandeja-util';

/**
 * Vista rápida de un documento desde la bandeja (el modal de detalle de SIIntranetD): datos,
 * descripción y el estatus de los turnos. Desde aquí se abre el documento o el expediente.
 */
@Component({
  selector: 'app-vista-rapida',
  standalone: true,
  imports: [Icono],
  template: `
    <div class="backdrop" (click)="$event.target === $event.currentTarget && cerrar.emit()">
      <div class="modal-i" role="dialog" aria-modal="true">
        @if (!detalle()) {
          <div class="modal-body"><p class="aviso">{{ error() ?? 'Cargando…' }}</p></div>
        } @else if (detalle(); as d) {
          <div class="modal-head">
            <div>
              <div class="mh-folio">{{ d.folio }}</div>
              <h3>{{ d.referenciaDocumento || 'Folio ' + d.folio }}</h3>
            </div>
            <button class="cerrar" type="button" aria-label="Cerrar" (click)="cerrar.emit()"><app-icono name="x" /></button>
          </div>
          <div class="modal-body">
            <div class="meta-grid">
              <div class="meta"><div class="k">Serie</div><div class="v">{{ d.serie.nombre || '—' }}</div></div>
              <div class="meta">
                <div class="k">Prioridad</div>
                <div class="v">
                  <span class="badge" [class]="prioridad()"><span class="dot" [class]="prioridad()"></span>{{ d.tipoAtencion.nombre }}</span>
                  @if (d.estatus === 'Cancelado') {
                    <span class="badge">Cancelado</span>
                  } @else if (d.estatus === 'Concluido') {
                    <span class="badge baja">Concluido</span>
                  }
                </div>
              </div>
              <div class="meta"><div class="k">Remitente</div><div class="v">{{ d.remitente.nombre }}</div></div>
              <div class="meta"><div class="k">Registró</div><div class="v">{{ d.registradoPor?.nombre ?? '—' }}</div></div>
              <div class="meta"><div class="k">Fecha de recepción</div><div class="v">{{ fechaCorta(d.fechaRecepcion) }}</div></div>
              <div class="meta"><div class="k">Fecha límite</div><div class="v">{{ fechaCorta(d.fechaLimiteAtencion) }}</div></div>
            </div>
            <div class="meta texto" style="margin-bottom: 14px"><div class="k">Asunto</div><div class="v">{{ d.asunto }}</div></div>
            <div class="meta texto"><div class="k">Indicaciones</div><div class="v">{{ d.indicaciones }}</div></div>

            <div class="modal-sub"><app-icono name="ojo" /> {{ modo() === 'entrada' ? 'Estatus de mi turno' : 'Estatus de los turnos' }}</div>
            <div class="acuse-list">
              @for (t of turnosVisibles(); track t.id) {
                <div class="acuse-item">
                  <div class="acuse-av" [style.background]="colorAvatar(t.nombre)">{{ iniciales(t.nombre) }}</div>
                  <div class="acuse-info">
                    <b>{{ t.nombre }}</b>
                    <small>{{ t.tipo === 'A' ? 'Para su atención' : 'Para su conocimiento' }}{{ t.turnadoPor ? ' · turnó ' + t.turnadoPor.nombre : '' }}</small><br />
                    <small>{{ t.comentarioConclusion || 'Turnado el ' + fechaHora(t.fecha) }}</small>
                  </div>
                  <span class="acuse-estado" [class]="claseEstado(t)">{{ textoEstado(t) }}</span>
                </div>
              } @empty {
                <div class="acuse-item"><div class="acuse-info"><small>Sin turnos.</small></div></div>
              }
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn-i btn-i-line" (click)="abrirExpediente()"><app-icono name="expediente" /> Abrir expediente</button>
            @if (d.tieneArchivo) {
              <button type="button" class="btn-i btn-i-primary" (click)="verDocumento()"><app-icono name="ojo" /> Ver documento</button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class VistaRapida implements OnInit {
  readonly registroId = input.required<number>();
  readonly modo = input<'entrada' | 'salida'>('entrada');
  readonly cerrar = output<void>();
  /** Se abrió el archivo: el servidor marca el turno propio como visto. */
  readonly documentoAbierto = output<void>();

  protected readonly detalle = signal<RegistroDetalle | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly fechaCorta = fechaCorta;
  protected readonly fechaHora = fechaHora;
  protected readonly iniciales = iniciales;
  protected readonly colorAvatar = colorAvatar;

  protected readonly prioridad = computed(() => clasePrioridad(this.detalle()?.tipoAtencion.id !== 1));

  /** En la bandeja de entrada solo interesa el turno propio; en la de salida, todos. */
  protected readonly turnosVisibles = computed<TurnoDetalle[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    if (this.modo() === 'entrada' && d.permisos.miTurno) {
      return d.turnos.filter((t) => t.id === d.permisos.miTurno!.id);
    }
    return d.turnos.filter((t) => t.activo || d.estatus === 'Cancelado');
  });

  constructor(
    private readonly registrosService: RegistrosService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.registrosService.detalle(this.registroId()).subscribe({
      next: (d) => this.detalle.set(d),
      error: () => this.error.set('No se pudo cargar el documento.'),
    });
  }

  textoEstado(t: TurnoDetalle): string {
    if (t.atendido) return t.tipo === 'A' ? 'Atendido' : 'Enterado';
    return t.visto ? 'Visto' : 'Pendiente';
  }

  claseEstado(t: TurnoDetalle): string {
    if (t.atendido) return t.tipo === 'A' ? 'ae-atendido' : 'ae-conocimiento';
    return t.visto ? 'ae-visto' : 'ae-pendiente';
  }

  verDocumento(): void {
    this.documentoAbierto.emit();
    abrirArchivo(this.http, this.registrosService.urlArchivo(this.registroId()), () =>
      this.toastService.error('No se pudo abrir el documento.'),
    );
  }

  abrirExpediente(): void {
    this.cerrar.emit();
    void this.router.navigate(['/documentos', this.registroId()]);
  }
}
