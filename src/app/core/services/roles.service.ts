import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Rol {
  id: number;
  clave: string;
  nombre: string;
}

export interface UsuarioBusqueda {
  rfc: string;
  nombre: string;
  puesto: string | null;
}

export interface Asignacion {
  rfc: string;
  nombre: string | null;
  puesto: string | null;
  rol: Rol;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  constructor(private readonly http: HttpClient) {}

  listRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${environment.apiUrl}/roles`);
  }

  buscarUsuarios(search: string): Observable<UsuarioBusqueda[]> {
    return this.http.get<UsuarioBusqueda[]>(`${environment.apiUrl}/roles/usuarios`, {
      params: { search },
    });
  }

  listAsignaciones(): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${environment.apiUrl}/roles/asignaciones`);
  }

  asignarRol(rfc: string, rolId: number): Observable<Asignacion> {
    return this.http.put<Asignacion>(`${environment.apiUrl}/roles/asignaciones`, { rfc, rolId });
  }

  quitarAsignacion(rfc: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/roles/asignaciones/${rfc}`);
  }
}
