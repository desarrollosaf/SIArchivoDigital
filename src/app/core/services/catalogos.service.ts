import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Opcion {
  id: number;
  nombre: string;
}

export interface OpcionCodigo extends Opcion {
  codigo: string;
}

export interface SerieRegistro extends Opcion {
  horarios: boolean;
}

/** Persona o grupo elegible como destinatario/remitente. Los grupos traen id "G:<n>". */
export interface Persona {
  id: string;
  nombre: string;
  detalle?: string | null;
}

export interface Departamento {
  id: number;
  clave: number | null;
  nombre: string;
}

const API = `${environment.apiUrl}/catalogos`;

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  constructor(private readonly http: HttpClient) {}

  tiposAtencion(): Observable<Opcion[]> {
    return this.http.get<Opcion[]>(`${API}/tipos-atencion`);
  }

  tiposSolicitud(): Observable<Opcion[]> {
    return this.http.get<Opcion[]>(`${API}/tipos-solicitud`);
  }

  salones(): Observable<(Opcion & { color: string | null })[]> {
    return this.http.get<(Opcion & { color: string | null })[]>(`${API}/salones`);
  }

  series(): Observable<SerieRegistro[]> {
    return this.http.get<SerieRegistro[]>(`${API}/series`);
  }

  secciones(): Observable<OpcionCodigo[]> {
    return this.http.get<OpcionCodigo[]>(`${API}/secciones`);
  }

  seriesDeSeccion(idSeccion: number): Observable<OpcionCodigo[]> {
    return this.http.get<OpcionCodigo[]>(`${API}/secciones/${idSeccion}/series`);
  }

  subseriesDeSerie(idSerie: number): Observable<OpcionCodigo[]> {
    return this.http.get<OpcionCodigo[]>(`${API}/series/${idSerie}/subseries`);
  }

  servidoresPublicos(search: string): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${API}/servidores-publicos`, { params: { search } });
  }

  destinatarios(search: string): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${API}/destinatarios`, { params: { search } });
  }

  departamentos(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${API}/departamentos`);
  }
}
