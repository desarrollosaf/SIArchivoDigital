import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import {
  AvisosWhatsappService,
  DestinatarioWhatsapp,
  EstadoWhatsapp,
  MesPdf,
  RespuestaEnvio,
} from '../../../core/services/avisos-whatsapp.service';
import { ToastService } from '../../../core/services/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { abrirArchivo } from '../../../shared/abrir-archivo';

function mensajeError(err: HttpErrorResponse, porDefecto: string): string {
  const mensaje = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join(' · ');
  return mensaje || porDefecto;
}

/**
 * Teléfonos que reciben los avisos de cumpleaños por WhatsApp (en Laravel estaban fijos en el
 * código) y envío manual o vista previa de esos avisos.
 */
@Component({
  selector: 'app-avisos-whatsapp',
  standalone: true,
  imports: [FormsModule, Modal],
  templateUrl: './avisos-whatsapp.html',
  styleUrl: './avisos-whatsapp.scss',
})
export class AvisosWhatsapp {
  protected readonly estado = signal<EstadoWhatsapp | null>(null);
  protected readonly destinatarios = signal<DestinatarioWhatsapp[]>([]);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal<string | null>(null);
  protected readonly ultimoEnvio = signal<{ titulo: string; r: RespuestaEnvio } | null>(null);

  protected readonly activos = computed(() => this.destinatarios().filter((d) => d.activo).length);
  protected readonly puedeEnviar = computed(() => {
    const e = this.estado();
    return !!e?.activo && e.configurado && this.activos() > 0;
  });

  // Formulario
  protected readonly editando = signal<{ id: number | null } | null>(null);
  protected readonly nombre = signal('');
  protected readonly telefono = signal('');
  protected readonly activo = signal(true);
  protected readonly guardando = signal(false);

  constructor(
    private readonly avisosService: AvisosWhatsappService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
  ) {
    this.avisosService.estado().subscribe({
      next: (e) => this.estado.set(e),
      error: () => this.toastService.error('No se pudo consultar el estado del envío.'),
    });
    this.avisosService.destinatarios().subscribe({
      next: (rows) => {
        this.destinatarios.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudieron cargar los teléfonos.');
      },
    });
  }

  /** "7221234567" -> "722 123 4567". */
  formatoTelefono(t: string): string {
    return t.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
  }

  nuevo(): void {
    this.nombre.set('');
    this.telefono.set('');
    this.activo.set(true);
    this.editando.set({ id: null });
  }

  editar(d: DestinatarioWhatsapp): void {
    this.nombre.set(d.nombre);
    this.telefono.set(d.telefono);
    this.activo.set(d.activo);
    this.editando.set({ id: d.id });
  }

  guardar(): void {
    const edicion = this.editando();
    if (!edicion) return;
    const telefono = this.telefono().replace(/\D/g, '');
    if (!this.nombre().trim()) {
      this.toastService.error('Captura el nombre.');
      return;
    }
    if (!/^\d{10}$/.test(telefono)) {
      this.toastService.error('El teléfono debe tener 10 dígitos (sin +52).');
      return;
    }
    this.guardando.set(true);
    this.avisosService
      .guardar(edicion.id, { nombre: this.nombre().trim(), telefono, activo: this.activo() })
      .subscribe({
        next: (rows) => {
          this.guardando.set(false);
          this.destinatarios.set(rows);
          this.editando.set(null);
          this.toastService.success('Teléfono guardado.');
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toastService.error(mensajeError(err, 'No se pudo guardar el teléfono.'));
        },
      });
  }

  alternar(d: DestinatarioWhatsapp): void {
    this.avisosService
      .guardar(d.id, { nombre: d.nombre, telefono: d.telefono, activo: !d.activo })
      .subscribe({
        next: (rows) => this.destinatarios.set(rows),
        error: () => this.toastService.error('No se pudo actualizar el teléfono.'),
      });
  }

  eliminar(d: DestinatarioWhatsapp): void {
    void Swal.fire({
      title: '¿Quitar este teléfono?',
      text: `${d.nombre} dejará de recibir los avisos de cumpleaños.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.avisosService.eliminar(d.id).subscribe({
        next: (rows) => {
          this.destinatarios.set(rows);
          this.toastService.success('Teléfono quitado.');
        },
        error: () => this.toastService.error('No se pudo quitar el teléfono.'),
      });
    });
  }

  verPdf(mes: MesPdf): void {
    abrirArchivo(this.http, this.avisosService.urlPdf(mes), () =>
      this.toastService.error('No se pudo generar el PDF.'),
    );
  }

  enviarDelDia(): void {
    this.confirmarEnvio('el aviso de cumpleaños de hoy', 'dia', () =>
      this.avisosService.enviarDelDia(),
    );
  }

  enviarPdf(mes: MesPdf): void {
    this.confirmarEnvio(
      `el PDF de cumpleaños del mes ${mes === 'actual' ? 'en curso' : 'siguiente'}`,
      `pdf-${mes}`,
      () => this.avisosService.enviarPdf(mes),
    );
  }

  private confirmarEnvio(
    que: string,
    clave: string,
    enviar: () => ReturnType<AvisosWhatsappService['enviarDelDia']>,
  ): void {
    void Swal.fire({
      title: '¿Enviar ahora?',
      text: `Se mandará ${que} por WhatsApp a ${this.activos()} ${
        this.activos() === 1 ? 'teléfono' : 'teléfonos'
      }.`,
      icon: 'question',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-primary)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.enviando.set(clave);
      enviar().subscribe({
        next: (res) => {
          this.enviando.set(null);
          this.ultimoEnvio.set({ titulo: que, r: res });
          if (!res.enviado) {
            this.toastService.info(res.motivo ?? 'No había nada que enviar.');
            return;
          }
          const ok = res.resultados.filter((x) => x.ok).length;
          if (ok === res.resultados.length) {
            this.toastService.success(`Enviado a ${ok} ${ok === 1 ? 'teléfono' : 'teléfonos'}.`);
          } else {
            this.toastService.error(
              `Se envió a ${ok} de ${res.resultados.length}. Revisa el detalle abajo.`,
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.enviando.set(null);
          this.toastService.error(mensajeError(err, 'No se pudo enviar.'));
        },
      });
    });
  }
}
