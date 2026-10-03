import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoTurno } from './registros.service';

export type FiltroTurnos = 'pendientes' | 'atendidos';

export interface TurnoBandeja {
  id: number;
  registroId: number;
  folio: string;
  /** Número de oficio del documento. */
  referencia: string | null;
  asunto: string;
  indicaciones: string;
  remitente: string;
  tipo: TipoTurno;
  urgente: boolean;
  fechaLimite: string;
  diasRestantes: number | null;
  recibido: string;
  visto: boolean;
  nuevo: boolean;
  turnadoPor: string | null;
  tieneArchivo: boolean;
  comentarioConclusion: string | null;
  /** El documento o el turno fue cancelado: se muestra marcado y sin acciones. */
  cancelado: boolean;
}

export interface BandejaEntrada {
  soloLectura: boolean;
  turnos: TurnoBandeja[];
}

export interface ResumenTurnos {
  pendientes: number;
  paraAtencion: number;
  vencidos: number;
  sinLeer: number;
  /** Registros propios todavía pendientes (bandeja de salida). */
  misPendientes: number;
}

export interface ConclusionPayload {
  comentario?: string;
  seccionId?: number | null;
  serieId?: number | null;
  subserieId?: number | null;
}

const API = `${environment.apiUrl}/turnos`;

@Injectable({ providedIn: 'root' })
export class TurnosService {
  constructor(private readonly http: HttpClient) {}

  resumen(): Observable<ResumenTurnos> {
    return this.http.get<ResumenTurnos>(`${API}/resumen`);
  }

  listar(estatus: FiltroTurnos, anio?: number, mes?: number | null): Observable<BandejaEntrada> {
    let params = new HttpParams().set('estatus', estatus);
    if (anio) params = params.set('anio', anio);
    if (mes) params = params.set('mes', mes);
    return this.http.get<BandejaEntrada>(API, { params });
  }

  turnar(
    registroId: number,
    atencion: string[],
    conocimiento: string[],
    indicaciones: string,
  ): Observable<{ agregados: number; omitidos: string[] }> {
    return this.http.post<{ agregados: number; omitidos: string[] }>(
      `${API}/registro/${registroId}`,
      {
        atencion,
        conocimiento,
        indicaciones: indicaciones || undefined,
      },
    );
  }

  marcarVisto(id: number): Observable<void> {
    return this.http.post<void>(`${API}/${id}/visto`, {});
  }

  concluir(id: number, payload: ConclusionPayload, archivo: File | null): Observable<void> {
    const datos = new FormData();
    if (payload.comentario) datos.append('comentario', payload.comentario);
    if (payload.seccionId) datos.append('seccionId', String(payload.seccionId));
    if (payload.serieId) datos.append('serieId', String(payload.serieId));
    if (payload.subserieId) datos.append('subserieId', String(payload.subserieId));
    if (archivo) datos.append('archivo', archivo);
    return this.http.post<void>(`${API}/${id}/concluir`, datos);
  }

  cancelar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }

  urlConclusion(id: number): string {
    return `${API}/${id}/conclusion`;
  }
}
