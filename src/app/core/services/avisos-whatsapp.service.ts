import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DestinatarioWhatsapp {
  id: number;
  nombre: string;
  /** 10 dígitos, sin +52. */
  telefono: string;
  activo: boolean;
}

export interface EstadoWhatsapp {
  /** WHATSAPP_ACTIVO=true en el .env del backend. */
  activo: boolean;
  /** Instancia y token de UltraMsg capturados. */
  configurado: boolean;
  /** Mensaje que saldría hoy; null si nadie cumple años. */
  mensajeHoy: string | null;
}

export interface ResultadoEnvio {
  telefono: string;
  ok: boolean;
  detalle?: string;
}

export interface RespuestaEnvio {
  enviado: boolean;
  motivo?: string;
  resultados: ResultadoEnvio[];
}

export type MesPdf = 'actual' | 'siguiente';

const API = `${environment.apiUrl}/avisos-whatsapp`;

@Injectable({ providedIn: 'root' })
export class AvisosWhatsappService {
  constructor(private readonly http: HttpClient) {}

  estado(): Observable<EstadoWhatsapp> {
    return this.http.get<EstadoWhatsapp>(`${API}/estado`);
  }

  destinatarios(): Observable<DestinatarioWhatsapp[]> {
    return this.http.get<DestinatarioWhatsapp[]>(`${API}/destinatarios`);
  }

  guardar(
    id: number | null,
    datos: Omit<DestinatarioWhatsapp, 'id'>,
  ): Observable<DestinatarioWhatsapp[]> {
    return id
      ? this.http.patch<DestinatarioWhatsapp[]>(`${API}/destinatarios/${id}`, datos)
      : this.http.post<DestinatarioWhatsapp[]>(`${API}/destinatarios`, datos);
  }

  eliminar(id: number): Observable<DestinatarioWhatsapp[]> {
    return this.http.delete<DestinatarioWhatsapp[]>(`${API}/destinatarios/${id}`);
  }

  urlPdf(mes: MesPdf): string {
    return `${API}/pdf?mes=${mes}`;
  }

  enviarDelDia(): Observable<RespuestaEnvio> {
    return this.http.post<RespuestaEnvio>(`${API}/enviar/dia`, {});
  }

  enviarPdf(mes: MesPdf): Observable<RespuestaEnvio> {
    return this.http.post<RespuestaEnvio>(`${API}/enviar/pdf`, { mes });
  }
}
