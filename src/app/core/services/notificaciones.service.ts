import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoNotificacion = 'turno' | 'comentario' | 'respuesta';

export interface ResumenNotificaciones {
  turnos: number;
  comentarios: number;
  respuestas: number;
  total: number;
}

export interface Notificacion {
  tipo: TipoNotificacion;
  id: number;
  registroId: number;
  folio: string;
  de: string | null;
  detalle: string;
  fecha: string;
}

const API = `${environment.apiUrl}/notificaciones`;

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  constructor(private readonly http: HttpClient) {}

  resumen(): Observable<ResumenNotificaciones> {
    return this.http.get<ResumenNotificaciones>(`${API}/resumen`);
  }

  listar(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(API);
  }

  marcarLeida(tipo: TipoNotificacion, id: number): Observable<void> {
    return this.http.post<void>(`${API}/${tipo}/${id}/leida`, {});
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.post<void>(`${API}/leidas`, {});
  }
}
