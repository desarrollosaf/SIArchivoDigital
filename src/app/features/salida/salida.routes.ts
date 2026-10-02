import { Routes } from '@angular/router';

export const SALIDA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./lista/salida-lista').then((m) => m.SalidaLista),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./formulario/registro-formulario').then((m) => m.RegistroFormulario),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./formulario/registro-formulario').then((m) => m.RegistroFormulario),
  },
];
