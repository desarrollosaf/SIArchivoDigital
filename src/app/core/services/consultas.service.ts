import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstatusRegistro } from './registros.service';

export interface EventoAgenda {
  id: number;
  registroId: number;
  titulo: string;
  descripcion: string;
  /** "YYYY-MM-DD HH:mm:ss", hora de México. */
  inicio: string;
  fin: string;
  color: string;
}

export interface DocumentoConcentracion {
  id: number;
  folio: string;
  asunto: string;
  remitente: string;
  serie: string;
  fechaRecepcion: string;
  creado: string;
  diasTranscurridos: number;
  estatus: EstatusRegistro;
  tieneArchivo: boolean;
}

export interface ResumenReporte {
  total: number;
  pendientes: number;
  concluidos: number;
  cancelados: number;
  pendientesPorPersona: { rfc: string; nombre: string; pendientes: number }[];
}

/** Consultas de solo lectura: agenda, archivo de concentración y reportes. */
@Injectable({ providedIn: 'root' })
export class ConsultasService {
  constructor(private readonly http: HttpClient) {}

  agenda(desde: string, hasta: string): Observable<EventoAgenda[]> {
    return this.http.get<EventoAgenda[]>(`${environment.apiUrl}/agenda`, {
      params: { desde, hasta },
    });
  }

  concentracion(): Observable<DocumentoConcentracion[]> {
    return this.http.get<DocumentoConcentracion[]>(`${environment.apiUrl}/concentracion`);
  }

  resumenReporte(desde: string, hasta: string, todos: boolean): Observable<ResumenReporte> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta).set('todos', todos);
    return this.http.get<ResumenReporte>(`${environment.apiUrl}/reportes/resumen`, { params });
  }

  urlConcentrado(desde: string, hasta: string, todos: boolean): string {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta).set('todos', todos);
    return `${environment.apiUrl}/reportes/concentrado?${params.toString()}`;
  }
}
