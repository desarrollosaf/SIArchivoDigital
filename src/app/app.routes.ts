import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'entrada',
        loadComponent: () => import('./features/entrada/entrada').then((m) => m.BandejaEntrada),
      },
      {
        path: 'salida',
        loadChildren: () => import('./features/salida/salida.routes').then((m) => m.SALIDA_ROUTES),
      },
      {
        path: 'documentos/:id/turno',
        loadComponent: () =>
          import('./features/documento/turno-imprimir').then((m) => m.TurnoImprimir),
      },
      {
        path: 'documentos/:id',
        loadComponent: () =>
          import('./features/documento/documento-detalle').then((m) => m.DocumentoDetalle),
      },
      {
        path: 'busqueda',
        loadComponent: () => import('./features/busqueda/busqueda').then((m) => m.Busqueda),
      },
      {
        path: 'agenda',
        loadComponent: () => import('./features/agenda/agenda').then((m) => m.AgendaCalendario),
      },
      {
        path: 'concentracion',
        loadComponent: () =>
          import('./features/concentracion/concentracion').then((m) => m.Concentracion),
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: 'presidencia/agenda',
        canActivate: [roleGuard(['presidencia', 'administrador'])],
        loadComponent: () =>
          import('./features/agenda-presidencia/agenda-presidencia').then(
            (m) => m.AgendaPresidencia,
          ),
      },
      {
        path: 'presidencia/eventos',
        canActivate: [roleGuard(['presidencia', 'administrador'])],
        loadComponent: () =>
          import('./features/agenda-presidencia/eventos-legislativos').then(
            (m) => m.EventosLegislativos,
          ),
      },
      {
        path: 'presidencia/agenda/imprimir',
        canActivate: [roleGuard(['presidencia', 'administrador'])],
        loadComponent: () =>
          import('./features/agenda-presidencia/agenda-presidencia-imprimir').then(
            (m) => m.AgendaPresidenciaImprimir,
          ),
      },
      {
        path: 'presidencia/cumpleanos',
        canActivate: [roleGuard(['presidencia', 'administrador'])],
        loadComponent: () =>
          import('./features/agenda-presidencia/cumpleanos').then((m) => m.Cumpleanos),
      },
      {
        path: 'presidencia/cumpleanos/imprimir',
        canActivate: [roleGuard(['presidencia', 'administrador'])],
        loadComponent: () =>
          import('./features/agenda-presidencia/cumpleanos-imprimir').then(
            (m) => m.CumpleanosImprimir,
          ),
      },
      {
        path: 'administracion/clasificacion',
        canActivate: [roleGuard(['administrador'])],
        loadComponent: () =>
          import('./features/administracion/clasificacion/clasificacion').then(
            (m) => m.Clasificacion,
          ),
      },
      {
        path: 'administracion/grupos',
        canActivate: [roleGuard(['administrador'])],
        loadComponent: () =>
          import('./features/administracion/grupos/grupos').then((m) => m.Grupos),
      },
      {
        path: 'administracion/roles',
        canActivate: [roleGuard(['administrador'])],
        loadChildren: () =>
          import('./features/administracion/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
