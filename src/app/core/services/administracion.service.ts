import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SeccionAdmin {
  id: number;
  codigo: string;
  seccion: string;
  departamentoId: number;
  departamento: string;
  activo: boolean;
  series: number;
}

export interface SerieAdmin {
  id: number;
  idSeccion: number;
  codigo: string;
  serie: string;
  horarios: boolean;
  duracionSistema: number | null;
  activo: boolean;
  subseries: number;
}

export interface SubserieAdmin {
  id: number;
  idSerie: number;
  codigo: string;
  subserie: string;
  activo: boolean;
}

export interface Grupo {
  id: number;
  grupo: string;
  miembros: { rfc: string; nombre: string }[];
}

const CLASIFICACION = `${environment.apiUrl}/clasificacion`;
const GRUPOS = `${environment.apiUrl}/grupos`;

/** Catálogos que solo administra el rol "administrador": clasificación archivística y grupos. */
@Injectable({ providedIn: 'root' })
export class AdministracionService {
  constructor(private readonly http: HttpClient) {}

  secciones(): Observable<SeccionAdmin[]> {
    return this.http.get<SeccionAdmin[]>(`${CLASIFICACION}/secciones`);
  }

  guardarSeccion(
    id: number | null,
    datos: { codigo: string; seccion: string; departamentoId: number },
  ): Observable<unknown> {
    return id
      ? this.http.patch<void>(`${CLASIFICACION}/secciones/${id}`, datos)
      : this.http.post<{ id: number }>(`${CLASIFICACION}/secciones`, datos);
  }

  alternarSeccion(id: number): Observable<void> {
    return this.http.post<void>(`${CLASIFICACION}/secciones/${id}/estatus`, {});
  }

  series(idSeccion: number): Observable<SerieAdmin[]> {
    return this.http.get<SerieAdmin[]>(`${CLASIFICACION}/secciones/${idSeccion}/series`);
  }

  guardarSerie(
    id: number | null,
    datos: {
      idSeccion: number;
      codigo: string;
      serie: string;
      horarios: boolean;
      duracionSistema: number;
    },
  ): Observable<unknown> {
    return id
      ? this.http.patch<void>(`${CLASIFICACION}/series/${id}`, datos)
      : this.http.post<{ id: number }>(`${CLASIFICACION}/series`, datos);
  }

  alternarSerie(id: number): Observable<void> {
    return this.http.post<void>(`${CLASIFICACION}/series/${id}/estatus`, {});
  }

  subseries(idSerie: number): Observable<SubserieAdmin[]> {
    return this.http.get<SubserieAdmin[]>(`${CLASIFICACION}/series/${idSerie}/subseries`);
  }

  guardarSubserie(
    id: number | null,
    datos: { idSerie: number; codigo: string; subserie: string },
  ): Observable<unknown> {
    return id
      ? this.http.patch<void>(`${CLASIFICACION}/subseries/${id}`, datos)
      : this.http.post<{ id: number }>(`${CLASIFICACION}/subseries`, datos);
  }

  alternarSubserie(id: number): Observable<void> {
    return this.http.post<void>(`${CLASIFICACION}/subseries/${id}/estatus`, {});
  }

  grupos(): Observable<Grupo[]> {
    return this.http.get<Grupo[]>(GRUPOS);
  }

  guardarGrupo(
    id: number | null,
    datos: { grupo: string; miembros: string[] },
  ): Observable<unknown> {
    return id
      ? this.http.patch<void>(`${GRUPOS}/${id}`, datos)
      : this.http.post<{ id: number }>(GRUPOS, datos);
  }

  eliminarGrupo(id: number): Observable<void> {
    return this.http.delete<void>(`${GRUPOS}/${id}`);
  }
}
