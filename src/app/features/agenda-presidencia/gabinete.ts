import { Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import {
  IntegranteGabinete,
  PresidenciaService,
  TipoGabinete,
} from '../../core/services/presidencia.service';
import { ToastService } from '../../core/services/toast.service';
import { MESES } from '../../core/services/cumpleanos.service';
import { Modal } from '../../shared/modal/modal';
import { cargarImagen } from '../../shared/imagen-protegida';

export const TIPOS_GABINETE: { valor: TipoGabinete; nombre: string }[] = [
  { valor: 0, nombre: 'Gobierno del Estado de México' },
  { valor: 1, nombre: 'Congreso del Estado de México' },
];

function mensajeError(err: HttpErrorResponse, porDefecto: string): string {
  const mensaje = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join(' · ');
  return mensaje || porDefecto;
}

/**
 * Catálogo del gabinete con su foto y fecha de nacimiento: alimenta "Cumpleaños del mes"
 * (Laravel: Gabinete, PumpesGabineteController).
 */
@Component({
  selector: 'app-gabinete',
  standalone: true,
  imports: [FormsModule, Modal],
  templateUrl: './gabinete.html',
  styleUrl: './gabinete.scss',
})
export class Gabinete implements OnDestroy {
  protected readonly tipos = TIPOS_GABINETE;
  protected readonly integrantes = signal<IntegranteGabinete[]>([]);
  protected readonly cargando = signal(true);
  protected readonly busqueda = signal('');
  protected readonly filtroTipo = signal<TipoGabinete | null>(null);
  /** Fotos ya descargadas (object URL) por id. */
  protected readonly fotos = signal<Record<number, string>>({});

  protected readonly visibles = computed(() => {
    const term = sinAcentos(this.busqueda().trim());
    const tipo = this.filtroTipo();
    return this.integrantes().filter(
      (g) =>
        (tipo === null || g.tipo === tipo) &&
        (!term || sinAcentos(`${g.nombre} ${g.cargo ?? ''}`).includes(term)),
    );
  });

  // Formulario
  protected readonly editando = signal<{ id: number | null } | null>(null);
  protected readonly nombre = signal('');
  protected readonly cargo = signal('');
  protected readonly profesion = signal('');
  protected readonly otros = signal('');
  protected readonly fechaNacimiento = signal('');
  protected readonly tipo = signal<TipoGabinete>(0);
  protected readonly fotoNueva = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly guardando = signal(false);

  constructor(
    private readonly presidenciaService: PresidenciaService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
  ) {
    this.cargar();
  }

  ngOnDestroy(): void {
    Object.values(this.fotos()).forEach((u) => URL.revokeObjectURL(u));
    this.limpiarVistaPrevia();
  }

  nombreTipo(tipo: TipoGabinete): string {
    return tipo === 1 ? 'Congreso' : 'Gobierno del Estado';
  }

  /** "1986-02-28" -> "28 de febrero". */
  cumpleanos(fecha: string | null): string {
    if (!fecha) return 'Sin fecha de nacimiento';
    const [, m, d] = fecha.split('-').map(Number);
    return `${d} de ${MESES[m - 1]}`;
  }

  iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  nuevo(): void {
    this.llenar(null);
  }

  editar(g: IntegranteGabinete): void {
    this.llenar(g);
  }

  cerrar(): void {
    this.editando.set(null);
    this.limpiarVistaPrevia();
  }

  onFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!/\.(jpe?g|png|webp)$/i.test(archivo.name)) {
      this.toastService.error('La foto debe ser JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.toastService.error('La foto no debe pesar más de 5 MB.');
      return;
    }
    this.limpiarVistaPrevia();
    this.fotoNueva.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  guardar(): void {
    const edicion = this.editando();
    if (!edicion) return;
    if (!this.nombre().trim()) {
      this.toastService.error('Captura el nombre.');
      return;
    }
    this.guardando.set(true);
    this.presidenciaService
      .guardarGabinete(
        edicion.id,
        {
          nombre: this.nombre().trim(),
          cargo: this.cargo().trim(),
          profesion: this.profesion().trim(),
          otros: this.otros().trim(),
          fechaNacimiento: this.fechaNacimiento(),
          tipo: this.tipo(),
        },
        this.fotoNueva(),
      )
      .subscribe({
        next: (g) => {
          this.guardando.set(false);
          this.toastService.success(edicion.id ? 'Cambios guardados.' : 'Persona agregada.');
          if (this.fotoNueva()) this.quitarFotoCache(g.id);
          this.cerrar();
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toastService.error(mensajeError(err, 'No se pudo guardar.'));
        },
      });
  }

  eliminar(g: IntegranteGabinete): void {
    void Swal.fire({
      title: '¿Eliminar del gabinete?',
      text: `${g.nombre} dejará de aparecer en "Cumpleaños del mes".`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.presidenciaService.eliminarGabinete(g.id).subscribe({
        next: () => {
          this.toastService.success('Eliminado del gabinete.');
          this.cargar();
        },
        error: () => this.toastService.error('No se pudo eliminar.'),
      });
    });
  }

  private llenar(g: IntegranteGabinete | null): void {
    this.limpiarVistaPrevia();
    this.nombre.set(g?.nombre ?? '');
    this.cargo.set(g?.cargo ?? '');
    this.profesion.set(g?.profesion ?? '');
    this.otros.set(g?.otros ?? '');
    this.fechaNacimiento.set(g?.fechaNacimiento ?? '');
    this.tipo.set(g?.tipo ?? 0);
    this.vistaPrevia.set(g ? (this.fotos()[g.id] ?? null) : null);
    this.editando.set({ id: g?.id ?? null });
  }

  /** La vista previa de una foto recién elegida es un object URL propio: se libera al cerrar. */
  private limpiarVistaPrevia(): void {
    const actual = this.vistaPrevia();
    const nueva = this.fotoNueva();
    if (actual && nueva) URL.revokeObjectURL(actual);
    this.fotoNueva.set(null);
    this.vistaPrevia.set(null);
  }

  private quitarFotoCache(id: number): void {
    const actual = this.fotos()[id];
    if (!actual) return;
    URL.revokeObjectURL(actual);
    this.fotos.update(({ [id]: _, ...resto }) => resto);
  }

  private cargar(): void {
    this.presidenciaService.gabinete().subscribe({
      next: (rows) => {
        this.integrantes.set(rows);
        this.cargando.set(false);
        for (const g of rows) {
          if (!g.tieneFoto || this.fotos()[g.id]) continue;
          cargarImagen(this.http, this.presidenciaService.urlFotoGabinete(g.id)).subscribe(
            (url) => {
              if (url) this.fotos.update((f) => ({ ...f, [g.id]: url }));
            },
          );
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo cargar el gabinete.');
      },
    });
  }
}

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
