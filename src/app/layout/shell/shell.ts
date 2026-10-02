import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { interval, of, Subject } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { InactivityService } from '../../core/services/inactivity.service';
import {
  Notificacion,
  NotificacionesService,
  ResumenNotificaciones,
} from '../../core/services/notificaciones.service';

const INTERVALO_NOTIFICACIONES_MS = 30000;
const SIN_NOTIFICACIONES: ResumenNotificaciones = {
  turnos: 0,
  comentarios: 0,
  respuestas: 0,
  total: 0,
};

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  children: NavChild[];
}

const BANDEJAS: NavItem = {
  label: 'Bandejas',
  children: [
    { label: 'Entrada (turnos recibidos)', route: '/entrada' },
    { label: 'Salida (mis registros)', route: '/salida' },
    { label: 'Registrar documento', route: '/salida/nuevo' },
  ],
};

const CONSULTAS: NavItem = {
  label: 'Consultas',
  children: [
    { label: 'Búsqueda de folios', route: '/busqueda' },
    { label: 'Agenda', route: '/agenda' },
    { label: 'Archivo de concentración', route: '/concentracion' },
    { label: 'Reportes', route: '/reportes' },
  ],
};

const PRESIDENCIA: NavItem = {
  label: 'Presidencia',
  children: [
    { label: 'Agenda legislativa', route: '/presidencia/agenda' },
    { label: 'Eventos legislativos', route: '/presidencia/eventos' },
  ],
};

const ADMINISTRACION: NavItem = {
  label: 'Administración',
  children: [
    { label: 'Clasificación archivística', route: '/administracion/clasificacion' },
    { label: 'Grupos de destinatarios', route: '/administracion/grupos' },
    { label: 'Roles de usuario', route: '/administracion/roles' },
  ],
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, DatePipe],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit, OnDestroy {
  protected readonly user;
  protected readonly nav;

  protected readonly resumen;
  protected readonly etiquetaNotificaciones;
  protected readonly panelAbierto = signal(false);
  protected readonly notificaciones = signal<Notificacion[]>([]);
  protected readonly cargandoNotificaciones = signal(false);

  private readonly refrescar$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly notificacionesService: NotificacionesService,
    protected readonly inactivity: InactivityService,
  ) {
    this.user = this.authService.currentUser;
    this.nav = computed(() => {
      const rol = this.user()?.rol;
      const menu = [BANDEJAS, CONSULTAS];
      if (rol === 'presidencia' || rol === 'administrador') menu.push(PRESIDENCIA);
      if (rol === 'administrador') menu.push(ADMINISTRACION);
      return menu;
    });

    const resumen$ = this.refrescar$.pipe(
      startWith(undefined),
      switchMap(() => interval(INTERVALO_NOTIFICACIONES_MS).pipe(startWith(0))),
      switchMap(() =>
        this.notificacionesService.resumen().pipe(catchError(() => of(SIN_NOTIFICACIONES))),
      ),
    );
    this.resumen = toSignal(resumen$, { initialValue: SIN_NOTIFICACIONES });
    this.etiquetaNotificaciones = computed(() => {
      const total = this.resumen().total;
      return total > 99 ? '99+' : String(total);
    });
  }

  ngOnInit(): void {
    this.inactivity.start();
  }

  ngOnDestroy(): void {
    this.inactivity.stop();
  }

  alternarPanel(): void {
    const abrir = !this.panelAbierto();
    this.panelAbierto.set(abrir);
    if (!abrir) return;

    this.cargandoNotificaciones.set(true);
    this.notificacionesService.listar().subscribe({
      next: (rows) => {
        this.notificaciones.set(rows);
        this.cargandoNotificaciones.set(false);
      },
      error: () => this.cargandoNotificaciones.set(false),
    });
  }

  abrirNotificacion(n: Notificacion): void {
    this.panelAbierto.set(false);
    this.notificacionesService
      .marcarLeida(n.tipo, n.id)
      .subscribe({ complete: () => this.refrescar$.next() });
    void this.router.navigate(['/documentos', n.registroId]);
  }

  marcarTodasLeidas(): void {
    this.notificacionesService.marcarTodasLeidas().subscribe(() => {
      this.notificaciones.set([]);
      this.refrescar$.next();
    });
  }

  logout(): void {
    this.inactivity.stop();
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  cerrarMenuMovil(): void {
    const menu = document.getElementById('mainNav');
    if (!menu || !menu.classList.contains('show')) return;

    const bootstrapGlobal = (window as unknown as { bootstrap?: BootstrapGlobal }).bootstrap;
    bootstrapGlobal?.Collapse.getOrCreateInstance(menu).hide();
  }
}

interface BootstrapGlobal {
  Collapse: {
    getOrCreateInstance(element: Element): { hide(): void };
  };
}
