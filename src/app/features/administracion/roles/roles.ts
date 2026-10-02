import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import {
  Asignacion,
  Rol,
  RolesService,
  UsuarioBusqueda,
} from '../../../core/services/roles.service';
import { ToastService } from '../../../core/services/toast.service';
import { AG_GRID_LOCALE, siadGridTheme } from '../../../shared/ag-grid/ag-grid-setup';
import { Badge, BadgesCeldaComponent } from '../../../shared/ag-grid/badges-celda';
import { BotonCeldaComponent } from '../../../shared/ag-grid/boton-celda';

@Component({
  selector: 'app-roles-asignacion',
  standalone: true,
  imports: [FormsModule, AgGridAngular],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class RolesAsignacion {
  protected readonly roles = signal<Rol[]>([]);
  protected readonly asignaciones = signal<Asignacion[]>([]);
  protected readonly cargandoAsignaciones = signal(true);

  protected readonly query = signal('');
  protected readonly resultados = signal<UsuarioBusqueda[]>([]);
  protected readonly mostrarResultados = signal(false);
  protected readonly buscando = signal(false);

  protected readonly usuarioSeleccionado = signal<UsuarioBusqueda | null>(null);
  protected readonly rolSeleccionadoId = signal<number | null>(null);

  protected readonly guardando = signal(false);

  protected readonly busquedaTabla = signal('');

  protected readonly gridTheme = siadGridTheme;
  protected readonly localeText = AG_GRID_LOCALE;
  protected readonly columnas: ColDef<Asignacion>[] = [
    {
      field: 'nombre',
      headerName: 'Usuario',
      minWidth: 180,
      flex: 1.6,
      wrapText: true,
      autoHeight: true,
      cellStyle: { lineHeight: '1.3', paddingTop: '10px', paddingBottom: '10px' },
    },
    { field: 'rfc', headerName: 'RFC', minWidth: 110, flex: 0.8 },
    {
      field: 'puesto',
      headerName: 'Puesto',
      minWidth: 150,
      flex: 1.1,
      wrapText: true,
      autoHeight: true,
      cellStyle: { lineHeight: '1.3', paddingTop: '10px', paddingBottom: '10px' },
    },
    {
      headerName: 'Rol',
      minWidth: 130,
      flex: 0.9,
      valueGetter: (params) => params.data?.rol?.nombre ?? '',
      cellRenderer: BadgesCeldaComponent,
      cellRendererParams: {
        badges: (params: { data: Asignacion }): Badge[] => [
          { texto: params.data.rol.nombre, clase: `badge--rol-${params.data.rol.clave}` },
        ],
      },
    },
    {
      headerName: '',
      width: 125,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: BotonCeldaComponent,
      cellRendererParams: {
        label: 'Quitar',
        onClick: (data: Asignacion) => this.quitar(data),
      },
    },
  ];

  private readonly searchTerms$ = new Subject<string>();

  constructor(
    private readonly rolesService: RolesService,
    private readonly toastService: ToastService,
  ) {
    this.rolesService.listRoles().subscribe((roles) => this.roles.set(roles));
    this.cargarAsignaciones();

    this.searchTerms$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim().length < 2) {
            return [];
          }
          this.buscando.set(true);
          return this.rolesService.buscarUsuarios(term);
        }),
      )
      .subscribe((resultados) => {
        this.buscando.set(false);
        this.resultados.set(resultados);
      });
  }

  onQueryChange(valor: string): void {
    this.query.set(valor);
    this.usuarioSeleccionado.set(null);
    this.mostrarResultados.set(true);
    this.searchTerms$.next(valor);
  }

  onQueryBlur(): void {
    setTimeout(() => this.mostrarResultados.set(false), 150);
  }

  onBusquedaTablaChange(valor: string): void {
    this.busquedaTabla.set(valor);
  }

  seleccionarUsuario(usuario: UsuarioBusqueda): void {
    this.usuarioSeleccionado.set(usuario);
    this.query.set(`${usuario.nombre} (${usuario.rfc})`);
    this.resultados.set([]);
    this.mostrarResultados.set(false);
  }

  asignar(): void {
    const usuario = this.usuarioSeleccionado();
    const rolId = this.rolSeleccionadoId();

    if (!usuario || !rolId) {
      return;
    }

    this.guardando.set(true);

    this.rolesService.asignarRol(usuario.rfc, rolId).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastService.success(`Rol asignado a ${usuario.nombre}.`);
        this.query.set('');
        this.usuarioSeleccionado.set(null);
        this.rolSeleccionadoId.set(null);
        this.cargarAsignaciones();
      },
      error: () => {
        this.guardando.set(false);
        this.toastService.error('No se pudo asignar el rol. Intenta de nuevo.');
      },
    });
  }

  quitar(asignacion: Asignacion): void {
    const nombre = asignacion.nombre ?? asignacion.rfc;

    Swal.fire({
      title: '¿Quitar este rol?',
      text: `${nombre} perderá el rol de ${asignacion.rol.nombre} y volverá a tener el rol "Usuario".`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.rolesService.quitarAsignacion(asignacion.rfc).subscribe({
        next: () => {
          this.toastService.success(`Rol quitado a ${nombre}.`);
          this.cargarAsignaciones();
        },
        error: () => this.toastService.error('No se pudo quitar el rol.'),
      });
    });
  }

  private cargarAsignaciones(): void {
    this.cargandoAsignaciones.set(true);
    this.rolesService.listAsignaciones().subscribe({
      next: (asignaciones) => {
        this.asignaciones.set(asignaciones);
        this.cargandoAsignaciones.set(false);
      },
      error: () => this.cargandoAsignaciones.set(false),
    });
  }
}
