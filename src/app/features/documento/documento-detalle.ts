import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { CatalogosService, OpcionCodigo, Persona } from '../../core/services/catalogos.service';
import {
  ComentarioDetalle,
  RegistroDetalle,
  RegistrosService,
} from '../../core/services/registros.service';
import { TurnosService } from '../../core/services/turnos.service';
import { ComentariosService } from '../../core/services/comentarios.service';
import { ToastService } from '../../core/services/toast.service';
import { Modal } from '../../shared/modal/modal';
import { PersonaPicker } from '../../shared/persona-picker/persona-picker';
import { FileUpload } from '../../shared/file-upload/file-upload';
import { abrirArchivo } from '../../shared/abrir-archivo';
import { fechaCorta } from '../../shared/estatus/estatus';

type ModalAbierto = 'turnar' | 'concluir' | null;

function mensajeError(err: HttpErrorResponse, porDefecto: string): string {
  const mensaje = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join(' · ');
  return mensaje || porDefecto;
}

@Component({
  selector: 'app-documento-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, Modal, PersonaPicker, FileUpload],
  templateUrl: './documento-detalle.html',
  styleUrl: './documento-detalle.scss',
})
export class DocumentoDetalle {
  protected readonly id: number;
  protected readonly registro = signal<RegistroDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly modal = signal<ModalAbierto>(null);
  protected readonly enviando = signal(false);
  protected readonly fechaCorta = fechaCorta;

  // Turnar
  protected readonly turnarAtencion = signal<Persona[]>([]);
  protected readonly turnarConocimiento = signal<Persona[]>([]);
  protected readonly turnarIndicaciones = signal('');

  // Concluir
  protected readonly conclusionComentario = signal('');
  protected readonly conclusionArchivos = signal<File[]>([]);
  protected readonly secciones = signal<OpcionCodigo[]>([]);
  protected readonly seriesClasificacion = signal<OpcionCodigo[]>([]);
  protected readonly subseries = signal<OpcionCodigo[]>([]);
  protected readonly seccionId = signal<number | null>(null);
  protected readonly serieId = signal<number | null>(null);
  protected readonly subserieId = signal<number | null>(null);

  // Comentarios
  protected readonly comentarioTexto = signal('');
  protected readonly comentarioPara = signal<Persona[]>([]);
  protected readonly comentarioArchivos = signal<File[]>([]);
  protected readonly respondiendoA = signal<number | null>(null);
  protected readonly respuestaTexto = signal('');

  protected readonly miTurno = computed(() => this.registro()?.permisos.miTurno ?? null);
  protected readonly puedeConcluir = computed(() => {
    const r = this.registro();
    const turno = this.miTurno();
    return (
      !!r && r.estatus !== 'Cancelado' && !!turno && !turno.atendido && !r.permisos.soloLectura
    );
  });
  protected readonly puedeTurnar = computed(() => {
    const r = this.registro();
    if (!r || r.estatus === 'Cancelado' || r.permisos.soloLectura) return false;
    return r.permisos.editar || !!this.miTurno();
  });
  /** Personas con turno en el documento: destinatarios sugeridos para un comentario. */
  protected readonly participantes = computed<Persona[]>(() => {
    const r = this.registro();
    if (!r) return [];
    const unicos = new Map<string, Persona>();
    for (const t of r.turnos) unicos.set(t.rfc, { id: t.rfc, nombre: t.nombre ?? t.rfc });
    return [...unicos.values()];
  });

  constructor(
    private readonly registrosService: RegistrosService,
    private readonly turnosService: TurnosService,
    private readonly comentariosService: ComentariosService,
    private readonly catalogosService: CatalogosService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
    private readonly router: Router,
    route: ActivatedRoute,
  ) {
    this.id = Number(route.snapshot.paramMap.get('id'));
    this.cargar(true);
  }

  verDocumento(): void {
    abrirArchivo(this.http, this.registrosService.urlArchivo(this.id), () =>
      this.toastService.error('No se pudo abrir el documento.'),
    );
  }

  verConclusion(turnoId: number): void {
    abrirArchivo(this.http, this.turnosService.urlConclusion(turnoId), () =>
      this.toastService.error('No se pudo abrir el archivo de conclusión.'),
    );
  }

  verAdjuntoComentario(id: number): void {
    abrirArchivo(this.http, this.comentariosService.urlArchivoComentario(id), () =>
      this.toastService.error('No se pudo abrir el archivo.'),
    );
  }

  verAdjuntoRespuesta(id: number): void {
    abrirArchivo(this.http, this.comentariosService.urlArchivoRespuesta(id), () =>
      this.toastService.error('No se pudo abrir el archivo.'),
    );
  }

  cancelarRegistro(): void {
    const r = this.registro();
    if (!r) return;
    void Swal.fire({
      title: '¿Cancelar este registro?',
      text: `El folio ${r.folio} dejará de aparecer en las bandejas de los destinatarios y en la agenda.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, cancelar registro',
      cancelButtonText: 'No',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;
      this.registrosService.cancelar(this.id).subscribe({
        next: () => {
          this.toastService.success(`Registro ${r.folio} cancelado.`);
          this.cargar();
        },
        error: (err: HttpErrorResponse) =>
          this.toastService.error(mensajeError(err, 'No se pudo cancelar.')),
      });
    });
  }

  quitarTurno(turnoId: number, nombre: string | null): void {
    void Swal.fire({
      title: '¿Quitar este turno?',
      text: `${nombre ?? 'La persona'} ya no verá este documento en su bandeja.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'No',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;
      this.turnosService.cancelar(turnoId).subscribe({
        next: () => {
          this.toastService.success('Turno retirado.');
          this.cargar();
        },
        error: (err: HttpErrorResponse) =>
          this.toastService.error(mensajeError(err, 'No se pudo quitar el turno.')),
      });
    });
  }

  abrirTurnar(): void {
    this.turnarAtencion.set([]);
    this.turnarConocimiento.set([]);
    this.turnarIndicaciones.set('');
    this.modal.set('turnar');
  }

  turnar(): void {
    const atencion = this.turnarAtencion().map((p) => p.id);
    const conocimiento = this.turnarConocimiento().map((p) => p.id);
    if (atencion.length + conocimiento.length === 0) {
      this.toastService.error('Elige al menos a una persona o grupo.');
      return;
    }
    this.enviando.set(true);
    this.turnosService
      .turnar(this.id, atencion, conocimiento, this.turnarIndicaciones().trim())
      .subscribe({
        next: (r) => {
          this.enviando.set(false);
          this.modal.set(null);
          const omitidos = r.omitidos.length ? ` Ya tenían turno: ${r.omitidos.join(', ')}.` : '';
          this.toastService.success(
            `Documento turnado a ${r.agregados} ${r.agregados === 1 ? 'persona' : 'personas'}.${omitidos}`,
          );
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.enviando.set(false);
          this.toastService.error(mensajeError(err, 'No se pudo turnar el documento.'));
        },
      });
  }

  abrirConcluir(): void {
    this.conclusionComentario.set('');
    this.conclusionArchivos.set([]);
    this.seccionId.set(null);
    this.serieId.set(null);
    this.subserieId.set(null);
    this.modal.set('concluir');
    if (this.secciones().length === 0) {
      this.catalogosService.secciones().subscribe((s) => this.secciones.set(s));
    }
  }

  onSeccion(id: number | null): void {
    this.seccionId.set(id);
    this.serieId.set(null);
    this.subserieId.set(null);
    this.seriesClasificacion.set([]);
    this.subseries.set([]);
    if (id)
      this.catalogosService.seriesDeSeccion(id).subscribe((s) => this.seriesClasificacion.set(s));
  }

  onSerie(id: number | null): void {
    this.serieId.set(id);
    this.subserieId.set(null);
    this.subseries.set([]);
    if (id) this.catalogosService.subseriesDeSerie(id).subscribe((s) => this.subseries.set(s));
  }

  concluir(): void {
    const turno = this.miTurno();
    if (!turno) return;
    const archivo = this.conclusionArchivos()[0] ?? null;
    if (!this.conclusionComentario().trim() && !archivo) {
      this.toastService.error('Escribe un comentario o adjunta el documento de respuesta.');
      return;
    }
    this.enviando.set(true);
    this.turnosService
      .concluir(
        turno.id,
        {
          comentario: this.conclusionComentario().trim() || undefined,
          seccionId: this.seccionId(),
          serieId: this.serieId(),
          subserieId: this.subserieId(),
        },
        archivo,
      )
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.modal.set(null);
          this.toastService.success('Turno concluido.');
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.enviando.set(false);
          this.toastService.error(mensajeError(err, 'No se pudo concluir el turno.'));
        },
      });
  }

  comentar(): void {
    const archivo = this.comentarioArchivos()[0] ?? null;
    if (!this.comentarioTexto().trim() && !archivo) {
      this.toastService.error('Escribe un comentario o adjunta un archivo.');
      return;
    }
    this.enviando.set(true);
    const para = this.comentarioPara()[0]?.id ?? null;
    this.comentariosService.comentar(this.id, this.comentarioTexto(), para, archivo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.comentarioTexto.set('');
        this.comentarioPara.set([]);
        this.comentarioArchivos.set([]);
        this.toastService.success('Comentario publicado.');
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.toastService.error(mensajeError(err, 'No se pudo publicar el comentario.'));
      },
    });
  }

  responder(comentario: ComentarioDetalle): void {
    if (!this.respuestaTexto().trim()) {
      this.toastService.error('Escribe tu respuesta.');
      return;
    }
    this.enviando.set(true);
    this.comentariosService.responder(comentario.id, this.respuestaTexto(), null).subscribe({
      next: () => {
        this.enviando.set(false);
        this.respondiendoA.set(null);
        this.respuestaTexto.set('');
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.toastService.error(mensajeError(err, 'No se pudo enviar la respuesta.'));
      },
    });
  }

  ultimoArchivo(files: File[]): File[] {
    return files.slice(-1);
  }

  private cargar(inicial = false): void {
    if (inicial) this.cargando.set(true);
    this.registrosService.detalle(this.id).subscribe({
      next: (r) => {
        this.registro.set(r);
        this.cargando.set(false);
        const turno = r.permisos.miTurno;
        if (inicial && turno && !r.permisos.soloLectura) {
          // Abrir el detalle cuenta como "visto" y apaga la notificación del turno.
          this.turnosService.marcarVisto(turno.id).subscribe({ error: () => undefined });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          err.status === 403
            ? 'No tienes acceso a este documento.'
            : err.status === 404
              ? 'El documento no existe.'
              : 'No se pudo cargar el documento.',
        );
      },
    });
  }

  irAEditar(): void {
    void this.router.navigate(['/salida', this.id, 'editar']);
  }
}
