import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdministracionService,
  SeccionAdmin,
  SerieAdmin,
  SubserieAdmin,
} from '../../../core/services/administracion.service';
import { CatalogosService, Departamento } from '../../../core/services/catalogos.service';
import { ToastService } from '../../../core/services/toast.service';
import { Modal } from '../../../shared/modal/modal';

type Nivel = 'seccion' | 'serie' | 'subserie';

interface Edicion {
  nivel: Nivel;
  id: number | null;
  codigo: string;
  nombre: string;
  departamentoId: number | null;
  horarios: boolean;
  duracionSistema: number;
}

const TITULOS: Record<Nivel, string> = { seccion: 'sección', serie: 'serie', subserie: 'subserie' };

@Component({
  selector: 'app-clasificacion',
  standalone: true,
  imports: [FormsModule, Modal],
  templateUrl: './clasificacion.html',
  styleUrl: './clasificacion.scss',
})
export class Clasificacion {
  protected readonly secciones = signal<SeccionAdmin[]>([]);
  protected readonly series = signal<SerieAdmin[]>([]);
  protected readonly subseries = signal<SubserieAdmin[]>([]);
  protected readonly departamentos = signal<Departamento[]>([]);
  protected readonly seccionSel = signal<SeccionAdmin | null>(null);
  protected readonly serieSel = signal<SerieAdmin | null>(null);
  protected readonly filtroDepartamento = signal<number | null>(null);
  protected readonly edicion = signal<Edicion | null>(null);
  protected readonly guardando = signal(false);
  protected readonly cargando = signal(true);

  protected readonly seccionesFiltradas = computed(() => {
    const depto = this.filtroDepartamento();
    return depto ? this.secciones().filter((s) => s.departamentoId === depto) : this.secciones();
  });
  /** Solo los departamentos que ya tienen secciones, para el filtro. */
  protected readonly departamentosConSecciones = computed(() => {
    const ids = new Set(this.secciones().map((s) => s.departamentoId));
    return this.departamentos().filter((d) => ids.has(d.id));
  });
  protected readonly tituloModal = computed(() => {
    const e = this.edicion();
    return e ? `${e.id ? 'Editar' : 'Agregar'} ${TITULOS[e.nivel]}` : '';
  });

  constructor(
    private readonly administracionService: AdministracionService,
    catalogosService: CatalogosService,
    private readonly toastService: ToastService,
  ) {
    catalogosService.departamentos().subscribe((d) => this.departamentos.set(d));
    this.cargarSecciones();
  }

  elegirSeccion(s: SeccionAdmin): void {
    this.seccionSel.set(s);
    this.serieSel.set(null);
    this.subseries.set([]);
    this.cargarSeries();
  }

  elegirSerie(s: SerieAdmin): void {
    this.serieSel.set(s);
    this.cargarSubseries();
  }

  nuevo(nivel: Nivel): void {
    this.edicion.set({
      nivel,
      id: null,
      codigo: this.codigoSugerido(nivel),
      nombre: '',
      departamentoId: this.seccionSel()?.departamentoId ?? this.filtroDepartamento(),
      horarios: false,
      duracionSistema: 730,
    });
  }

  editarSeccion(s: SeccionAdmin): void {
    this.edicion.set({
      nivel: 'seccion',
      id: s.id,
      codigo: s.codigo,
      nombre: s.seccion,
      departamentoId: s.departamentoId,
      horarios: false,
      duracionSistema: 730,
    });
  }

  editarSerie(s: SerieAdmin): void {
    this.edicion.set({
      nivel: 'serie',
      id: s.id,
      codigo: s.codigo,
      nombre: s.serie,
      departamentoId: null,
      horarios: s.horarios,
      duracionSistema: s.duracionSistema ?? 730,
    });
  }

  editarSubserie(s: SubserieAdmin): void {
    this.edicion.set({
      nivel: 'subserie',
      id: s.id,
      codigo: s.codigo,
      nombre: s.subserie,
      departamentoId: null,
      horarios: false,
      duracionSistema: 730,
    });
  }

  actualizar(cambios: Partial<Edicion>): void {
    this.edicion.update((e) => (e ? { ...e, ...cambios } : e));
  }

  guardar(): void {
    const e = this.edicion();
    if (!e) return;
    if (!e.codigo.trim() || !e.nombre.trim() || (e.nivel === 'seccion' && !e.departamentoId)) {
      this.toastService.error('Captura todos los campos obligatorios.');
      return;
    }
    let peticion: Observable<unknown>;
    if (e.nivel === 'seccion') {
      peticion = this.administracionService.guardarSeccion(e.id, {
        codigo: e.codigo.trim(),
        seccion: e.nombre.trim(),
        departamentoId: e.departamentoId!,
      });
    } else if (e.nivel === 'serie') {
      peticion = this.administracionService.guardarSerie(e.id, {
        idSeccion: this.seccionSel()!.id,
        codigo: e.codigo.trim(),
        serie: e.nombre.trim(),
        horarios: e.horarios,
        duracionSistema: Number(e.duracionSistema) || 730,
      });
    } else {
      peticion = this.administracionService.guardarSubserie(e.id, {
        idSerie: this.serieSel()!.id,
        codigo: e.codigo.trim(),
        subserie: e.nombre.trim(),
      });
    }

    this.guardando.set(true);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.edicion.set(null);
        this.toastService.success('Cambios guardados.');
        this.recargarNivel(e.nivel);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toastService.error(
          err.status === 400 ? 'Revisa los datos capturados.' : 'No se pudo guardar.',
        );
      },
    });
  }

  alternar(nivel: Nivel, id: number): void {
    const peticion =
      nivel === 'seccion'
        ? this.administracionService.alternarSeccion(id)
        : nivel === 'serie'
          ? this.administracionService.alternarSerie(id)
          : this.administracionService.alternarSubserie(id);
    peticion.subscribe({
      next: () => this.recargarNivel(nivel),
      error: () => this.toastService.error('No se pudo cambiar el estatus.'),
    });
  }

  private recargarNivel(nivel: Nivel): void {
    if (nivel === 'seccion') this.cargarSecciones();
    if (nivel === 'serie') {
      this.cargarSeries();
      this.cargarSecciones();
    }
    if (nivel === 'subserie') {
      this.cargarSubseries();
      this.cargarSeries();
    }
  }

  /** Propone el código siguiente: "PLEM/SAF/1S" -> serie "PLEM/SAF/1S.4" -> subserie "PLEM/SAF/1S.4.1". */
  private codigoSugerido(nivel: Nivel): string {
    if (nivel === 'serie' && this.seccionSel())
      return `${this.seccionSel()!.codigo}.${this.series().length + 1}`;
    if (nivel === 'subserie' && this.serieSel())
      return `${this.serieSel()!.codigo}.${this.subseries().length + 1}`;
    return '';
  }

  private cargarSecciones(): void {
    this.administracionService.secciones().subscribe({
      next: (rows) => {
        this.secciones.set(rows);
        const sel = this.seccionSel();
        if (sel) this.seccionSel.set(rows.find((r) => r.id === sel.id) ?? null);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo cargar el cuadro de clasificación.');
      },
    });
  }

  private cargarSeries(): void {
    const seccion = this.seccionSel();
    if (!seccion) return;
    this.administracionService.series(seccion.id).subscribe((rows) => {
      this.series.set(rows);
      const sel = this.serieSel();
      if (sel) this.serieSel.set(rows.find((r) => r.id === sel.id) ?? null);
    });
  }

  private cargarSubseries(): void {
    const serie = this.serieSel();
    if (!serie) return;
    this.administracionService.subseries(serie.id).subscribe((rows) => this.subseries.set(rows));
  }
}
