import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** 0 = Gobierno del Estado de México, 1 = Congreso del Estado de México. */
export type TipoGabinete = 0 | 1;

export interface IntegranteGabinete {
  id: number;
  nombre: string;
  cargo: string | null;
  profesion: string | null;
  otros: string | null;
  /** YYYY-MM-DD */
  fechaNacimiento: string | null;
  tipo: TipoGabinete;
  tieneFoto: boolean;
}

export interface GabinetePayload {
  nombre: string;
  cargo: string;
  profesion: string;
  otros: string;
  fechaNacimiento: string;
  tipo: TipoGabinete;
}

export interface DiputadoListado {
  id: string;
  nombre: string;
  partido: string | null;
  distrito: string | null;
}

export interface FichaDiputado {
  id: string;
  nombre: string;
  tratamiento: string;
  /** URL pública del portal del Legislativo. */
  foto: string | null;
  partido: string | null;
  partidoNombre: string | null;
  distrito: string | null;
  cabecera: string | null;
  descripcion: string | null;
  email: string | null;
  ext: string | null;
  telefono: string | null;
  redes: {
    facebook: string | null;
    twitter: string | null;
    instagram: string | null;
    web: string | null;
  };
  /** YYYY-MM-DD, tomada del RFC del padrón. */
  nacimiento: string | null;
  comisiones: { comision: string; cargo: string | null }[];
}

export interface ProximoEvento {
  id: number;
  folio: string;
  horaInicio: string | null;
  horaTermino: string | null;
  nombreEvento: string | null;
  indicaciones: string;
  asunto: string;
  atencion: string[];
  tieneArchivo: boolean;
}

export interface ProximosEventos {
  fecha: string;
  eventos: ProximoEvento[];
}

const API = environment.apiUrl;

/** Gabinete, diputados y próximos eventos (pantallas de Presidencia). */
@Injectable({ providedIn: 'root' })
export class PresidenciaService {
  constructor(private readonly http: HttpClient) {}

  gabinete(): Observable<IntegranteGabinete[]> {
    return this.http.get<IntegranteGabinete[]>(`${API}/gabinete`);
  }

  urlFotoGabinete(id: number): string {
    return `${API}/gabinete/${id}/foto`;
  }

  guardarGabinete(
    id: number | null,
    datos: GabinetePayload,
    foto: File | null,
  ): Observable<IntegranteGabinete> {
    const form = new FormData();
    for (const [clave, valor] of Object.entries(datos)) form.append(clave, String(valor ?? ''));
    if (foto) form.append('foto', foto);
    return id
      ? this.http.patch<IntegranteGabinete>(`${API}/gabinete/${id}`, form)
      : this.http.post<IntegranteGabinete>(`${API}/gabinete`, form);
  }

  eliminarGabinete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${API}/gabinete/${id}`);
  }

  diputados(): Observable<DiputadoListado[]> {
    return this.http.get<DiputadoListado[]>(`${API}/diputados`);
  }

  diputado(id: string): Observable<FichaDiputado> {
    return this.http.get<FichaDiputado>(`${API}/diputados/${id}`);
  }

  proximosEventos(fecha: string | null): Observable<ProximosEventos> {
    const params = fecha ? new HttpParams().set('fecha', fecha) : undefined;
    return this.http.get<ProximosEventos>(`${API}/agenda-presidencia/proximos`, { params });
  }

  urlArchivoEvento(id: number): string {
    return `${API}/agenda-presidencia/proximos/${id}/archivo`;
  }
}
