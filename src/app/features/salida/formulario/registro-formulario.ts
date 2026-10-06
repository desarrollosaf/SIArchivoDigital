import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  CatalogosService,
  Opcion,
  Persona,
  SerieRegistro,
} from '../../../core/services/catalogos.service';
import { RegistroPayload, RegistrosService } from '../../../core/services/registros.service';
import { ToastService } from '../../../core/services/toast.service';
import { FileUpload } from '../../../shared/file-upload/file-upload';
import { PersonaPicker } from '../../../shared/persona-picker/persona-picker';
import { fechaHoyMexico } from '../../../shared/utils/fecha-mexico';

const REMITENTE_EXTERNO: Persona = { id: '999', nombre: 'Remitente externo (otra institución)' };

function mensajeError(err: HttpErrorResponse, porDefecto: string): string {
  const mensaje = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join(' · ');
  return mensaje || porDefecto;
}

@Component({
  selector: 'app-registro-formulario',
  standalone: true,
  imports: [FormsModule, RouterLink, FileUpload, PersonaPicker],
  templateUrl: './registro-formulario.html',
  styleUrl: './registro-formulario.scss',
})
export class RegistroFormulario {
  protected readonly idRegistro: number | null;
  protected readonly modoEdicion: boolean;
  protected readonly remitenteExterno = [REMITENTE_EXTERNO];

  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly intentoGuardar = signal(false);

  protected readonly series = signal<SerieRegistro[]>([]);
  protected readonly tiposAtencion = signal<Opcion[]>([]);
  protected readonly tiposSolicitud = signal<Opcion[]>([]);
  protected readonly salones = signal<Opcion[]>([]);
  protected readonly folio = signal<string | null>(null);
  protected readonly sinDepartamento = signal(false);

  protected readonly fechaRecepcion = signal(fechaHoyMexico());
  protected readonly fechaDocumento = signal('');
  protected readonly referenciaDocumento = signal('');
  protected readonly fojas = signal<number | null>(null);
  protected readonly tipoSolicitud = signal<number | null>(null);
  protected readonly rastreo = signal<Persona[]>([]);
  protected readonly remitente = signal<Persona[]>([]);
  protected readonly otroRemitente = signal('');
  protected readonly serieId = signal<number | null>(null);
  protected readonly tipoAtencion = signal<number | null>(1);
  protected readonly fechaLimite = signal('');
  protected readonly horaInicio = signal('');
  protected readonly horaTermino = signal('');
  protected readonly salon = signal<number | null>(null);
  protected readonly nombreEvento = signal('');
  protected readonly asunto = signal('');
  protected readonly indicaciones = signal('');
  protected readonly atencion = signal<Persona[]>([]);
  protected readonly conocimiento = signal<Persona[]>([]);
  protected readonly archivos = signal<File[]>([]);
  protected readonly tieneArchivoActual = signal(false);

  protected readonly esExterno = computed(() => this.remitente()[0]?.id === REMITENTE_EXTERNO.id);
  protected readonly pideHorario = computed(
    () => this.series().find((s) => s.id === this.serieId())?.horarios ?? false,
  );

  protected readonly invalidos = computed(() => {
    if (!this.intentoGuardar()) return new Set<string>();
    const faltan = new Set<string>();
    if (!this.fechaRecepcion()) faltan.add('fechaRecepcion');
    if (!this.fechaLimite()) faltan.add('fechaLimite');
    if (this.fechaLimite() && this.fechaRecepcion() && this.fechaLimite() < this.fechaRecepcion()) {
      faltan.add('fechaLimite');
    }
    if (!this.serieId()) faltan.add('serie');
    if (!this.tipoAtencion()) faltan.add('tipoAtencion');
    if (this.remitente().length === 0) faltan.add('remitente');
    if (this.esExterno() && !this.otroRemitente().trim()) faltan.add('otroRemitente');
    if (!this.asunto().trim()) faltan.add('asunto');
    if (!this.indicaciones().trim()) faltan.add('indicaciones');
    if (this.atencion().length + this.conocimiento().length === 0) faltan.add('destinatarios');
    return faltan;
  });

  constructor(
    private readonly catalogosService: CatalogosService,
    private readonly registrosService: RegistrosService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    route: ActivatedRoute,
  ) {
    const idParam = route.snapshot.paramMap.get('id');
    this.idRegistro = idParam ? Number(idParam) : null;
    this.modoEdicion = this.idRegistro !== null;
    this.cargarCatalogos();
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    if (this.invalidos().size > 0) {
      this.toastService.error('Revisa los campos marcados: faltan datos obligatorios.');
      return;
    }

    const payload: RegistroPayload = {
      fechaRecepcion: this.fechaRecepcion(),
      fechaDocumento: this.fechaDocumento() || undefined,
      referenciaDocumento: this.referenciaDocumento().trim() || undefined,
      fechaLimiteAtencion: this.fechaLimite(),
      // Hora de inicio del evento, o la hora de atención en las demás series (hora_atencion).
      horaInicio: this.horaInicio() || undefined,
      horaTermino: this.pideHorario() ? this.horaTermino() || undefined : undefined,
      tipoAtencion: this.tipoAtencion()!,
      serieId: this.serieId()!,
      tituloDoc: this.indicaciones().trim(),
      descripcionDoc: this.asunto().trim(),
      remitenteRfc: this.remitente()[0].id,
      otroRemitente: this.esExterno() ? this.otroRemitente().trim() : undefined,
      fojas: this.fojas() ?? undefined,
      tipoSolicitud: this.tipoSolicitud() ?? undefined,
      salon: this.pideHorario() ? (this.salon() ?? undefined) : undefined,
      nombreEvento: this.pideHorario() ? this.nombreEvento().trim() || undefined : undefined,
      folioRastreo: this.rastreo()[0] ? Number(this.rastreo()[0].id) : undefined,
      atencion: this.atencion().map((p) => p.id),
      conocimiento: this.conocimiento().map((p) => p.id),
    };
    const archivo = this.archivos()[0] ?? null;

    this.enviando.set(true);
    if (this.modoEdicion) {
      this.registrosService.editar(this.idRegistro!, payload, archivo).subscribe({
        next: () => this.alGuardar(this.idRegistro!, 'Registro actualizado.'),
        error: (err: HttpErrorResponse) => this.alFallar(err),
      });
    } else {
      this.registrosService.crear(payload, archivo).subscribe({
        next: (r) => this.alGuardar(r.id, `Documento registrado con el folio ${r.folio}.`),
        error: (err: HttpErrorResponse) => this.alFallar(err),
      });
    }
  }

  onArchivos(files: File[]): void {
    // Un registro lleva un solo documento: si eligen otro, reemplaza al anterior.
    this.archivos.set(files.slice(-1));
  }

  private alGuardar(id: number, mensaje: string): void {
    this.enviando.set(false);
    this.toastService.success(mensaje);
    void this.router.navigate(['/documentos', id]);
  }

  private alFallar(err: HttpErrorResponse): void {
    this.enviando.set(false);
    this.toastService.error(mensajeError(err, 'No se pudo guardar el registro.'));
  }

  private cargarCatalogos(): void {
    forkJoin({
      series: this.catalogosService.series(),
      tiposAtencion: this.catalogosService.tiposAtencion(),
      tiposSolicitud: this.catalogosService.tiposSolicitud(),
      salones: this.catalogosService.salones(),
      contexto: this.registrosService.contextoNuevo(),
    }).subscribe({
      next: (c) => {
        this.series.set(c.series);
        this.tiposAtencion.set(c.tiposAtencion);
        this.tiposSolicitud.set(c.tiposSolicitud);
        this.salones.set(c.salones);
        if (this.modoEdicion) {
          this.cargarRegistro(this.idRegistro!);
        } else {
          this.folio.set(c.contexto.folio);
          this.sinDepartamento.set(c.contexto.sinDepartamento);
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudieron cargar los catálogos del formulario.');
      },
    });
  }

  private cargarRegistro(id: number): void {
    this.registrosService.detalle(id).subscribe({
      next: (r) => {
        this.folio.set(r.folio);
        this.fechaRecepcion.set(r.fechaRecepcion);
        this.fechaDocumento.set(r.fechaDocumento ?? '');
        this.referenciaDocumento.set(r.referenciaDocumento ?? '');
        this.fojas.set(r.fojas);
        this.tipoSolicitud.set(r.tipoSolicitud);
        this.rastreo.set(
          r.folioRastreo ? [{ id: String(r.folioRastreo.id), nombre: r.folioRastreo.folio }] : [],
        );
        this.remitente.set(
          r.remitente.rfc === REMITENTE_EXTERNO.id
            ? [REMITENTE_EXTERNO]
            : [{ id: r.remitente.rfc, nombre: r.remitente.nombre }],
        );
        this.otroRemitente.set(r.otroRemitente ?? '');
        if (!this.series().some((s) => s.id === r.serie.id)) {
          // Serie de otro departamento o ya desactivada: se agrega para no perderla al guardar.
          this.series.update((s) => [
            ...s,
            { id: r.serie.id, nombre: r.serie.nombre, horarios: false },
          ]);
        }
        this.serieId.set(r.serie.id);
        this.tipoAtencion.set(r.tipoAtencion.id);
        this.fechaLimite.set(r.fechaLimiteAtencion);
        this.horaInicio.set(r.horaInicio ?? '');
        this.horaTermino.set(r.horaTermino ?? '');
        this.salon.set(r.salon);
        this.nombreEvento.set(r.nombreEvento ?? '');
        this.asunto.set(r.asunto);
        this.indicaciones.set(r.indicaciones);
        this.atencion.set(r.destinatariosRegistro.atencion);
        this.conocimiento.set(r.destinatariosRegistro.conocimiento);
        this.tieneArchivoActual.set(r.tieneArchivo);
        this.cargando.set(false);
        if (!r.permisos.editar) {
          this.toastService.info('Este registro ya no se puede editar.');
          void this.router.navigate(['/documentos', id]);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo cargar el registro.');
      },
    });
  }
}
