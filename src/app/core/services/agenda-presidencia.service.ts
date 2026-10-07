import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type OrigenEvento = 'documento' | 'legislativo';
export type TipoReportePresidencia = 'general' | 'comisiones';

export interface SedePresidencia {
  id: number;
  nombre: string;
  color: string | null;
}

export interface EventoPresidencia {
  id: number;
  registroId: number | null;
  origen: OrigenEvento;
  titulo: string;
  fecha: string;
  /** "YYYY-MM-DD HH:mm:ss", hora de México. */
  inicio: string | null;
  fin: string | null;
  color: string;
  sede: string | null;
}

export interface DetalleEventoPresidencia {
  id: number;
  origen: OrigenEvento;
  registroId: number | null;
  titulo: string;
  fecha: string;
  horaInicio: string | null;
  horaTermino: string | null;
  sede: string | null;
  color: string;
  nombreEvento: string | null;
  // De un documento (serie EVENTOS)
  indicaciones: string | null;
  asunto: string | null;
  folio: string | null;
  referencia: string | null;
  tipoAtencion: string | null;
  remitente: string | null;
  // De un evento legislativo
  tipoEvento: string | null;
  materia: string | null;
  tipoReunion: string | null;
  modalidad: string | null;
  /** Nombres de las comisiones (eventos de comisión). */
  comisiones: string[];
  capturo: string | null;
}

export interface ReportePresidencia {
  tipo: TipoReportePresidencia;
  desde: string;
  hasta: string;
  sede: string | null;
  dias: { fecha: string; eventos: DetalleEventoPresidencia[] }[];
}

export type CategoriaEvento = 'comision' | 'sesion' | 'evento' | 'visita' | 'comedor' | 'foraneo';

export interface EventoDetallado {
  id: number;
  fecha: string;
  /** "HH:mm", hora de México. */
  horaInicio: string | null;
  horaTermino: string | null;
  sedeId: number | null;
  sede: string | null;
  categoria: CategoriaEvento;
  titulo: string;
  detalle: string | null;
  solicitante: string | null;
  /** Comisiones del evento legislativo (se muestran en lugar del solicitante). */
  comisiones: string[];
  cancelado: boolean;
  /** "YYYY-MM-DD HH:mm" en que se canceló. */
  canceladoEl: string | null;
  /** En el día original de un evento reprogramado: la fecha a la que pasó (no ocupa la sede). */
  reprogramadoA: string | null;
  /** En el día actual de un evento reprogramado: la fecha en que estaba antes. */
  reprogramadoDe: string | null;
}

export interface AgendaDetallada {
  desde: string;
  hasta: string;
  salones: SedePresidencia[];
  dias: { fecha: string; eventos: EventoDetallado[] }[];
}

const API = `${environment.apiUrl}/agenda-presidencia`;

function parametros(valores: Record<string, string | number | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && valor !== '') params = params.set(clave, valor);
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class AgendaPresidenciaService {
  constructor(private readonly http: HttpClient) {}

  sedes(): Observable<SedePresidencia[]> {
    return this.http.get<SedePresidencia[]>(`${API}/sedes`);
  }

  eventos(desde: string, hasta: string, sede: number | null): Observable<EventoPresidencia[]> {
    return this.http.get<EventoPresidencia[]>(`${API}/eventos`, {
      params: parametros({ desde, hasta, sede }),
    });
  }

  detalle(id: number): Observable<DetalleEventoPresidencia> {
    return this.http.get<DetalleEventoPresidencia>(`${API}/eventos/${id}`);
  }

  detallada(desde: string, hasta: string | null): Observable<AgendaDetallada> {
    return this.http.get<AgendaDetallada>(`${API}/detallada`, {
      params: parametros({ desde, hasta }),
    });
  }

  reporte(
    tipo: TipoReportePresidencia,
    desde: string,
    hasta: string | null,
    sede: number | null,
  ): Observable<ReportePresidencia> {
    return this.http.get<ReportePresidencia>(`${API}/reporte`, {
      params: parametros({ tipo, desde, hasta, sede }),
    });
  }
}

export interface Opcion {
  id: number;
  nombre: string;
}

export interface CatalogosLegislativos {
  tiposEvento: Opcion[];
  tiposReunion: Opcion[];
  modalidades: Opcion[];
  comisiones: { id: string; nombre: string }[];
  sedes: SedePresidencia[];
}

export interface EventoLegislativo {
  id: number;
  fechaEvento: string;
  /** Último día de un evento de varios días; null = un solo día. */
  fechaFin: string | null;
  horaInicio: string | null;
  horaTermino: string | null;
  tipoEvento: { id: number; nombre: string | null };
  sede: { id: number; nombre: string | null };
  modalidad: { id: number | null; nombre: string | null };
  tipoReunion: { id: number | null; nombre: string | null };
  nombreEvento: string | null;
  materia: string | null;
  comisiones: { id: string; nombre: string }[];
  capturo: string | null;
  /** Historial de cambios de fecha, la más reciente primero. */
  reprogramaciones: Reprogramacion[];
}

export interface Reprogramacion {
  fechaAnterior: string;
  fechaFinAnterior: string | null;
  horaInicioAnterior: string | null;
  horaTerminoAnterior: string | null;
  sedeAnterior: string | null;
  fechaNueva: string;
  motivo: string;
  por: string | null;
  el: string;
}

export interface ReprogramarPayload {
  fechaEvento: string;
  fechaFin: string | null;
  horaInicio: string;
  horaTermino: string;
  sede: number;
  motivo: string;
}

export interface EventoLegislativoPayload {
  fechaEvento: string;
  fechaFin: string | null;
  horaInicio: string;
  horaTermino: string;
  tipoEvento: number;
  sede: number;
  modalidad: number;
  tipoReunion: number | null;
  nombreEvento: string;
  materia: string | null;
  comisiones: string[];
}

export interface Disponibilidad {
  disponible: boolean;
  conflictos: { descripcion: string; horario: string }[];
}

const LEGISLATIVOS = `${API}/legislativos`;

/** Captura de eventos legislativos (en Laravel: RegistroPresidencia). */
@Injectable({ providedIn: 'root' })
export class EventosLegislativosService {
  constructor(private readonly http: HttpClient) {}

  catalogos(): Observable<CatalogosLegislativos> {
    return this.http.get<CatalogosLegislativos>(`${LEGISLATIVOS}/catalogos`);
  }

  listar(anio: number): Observable<EventoLegislativo[]> {
    return this.http.get<EventoLegislativo[]>(LEGISLATIVOS, { params: { anio } });
  }

  disponibilidad(
    fecha: string,
    inicio: string,
    termino: string,
    sede: number,
    excluir: number | null,
    hasta: string | null = null,
  ): Observable<Disponibilidad> {
    return this.http.get<Disponibilidad>(`${LEGISLATIVOS}/disponibilidad`, {
      params: parametros({ fecha, inicio, termino, sede, excluir, hasta }),
    });
  }

  reprogramar(id: number, datos: ReprogramarPayload): Observable<EventoLegislativo> {
    return this.http.post<EventoLegislativo>(`${LEGISLATIVOS}/${id}/reprogramar`, datos);
  }

  guardar(id: number | null, datos: EventoLegislativoPayload): Observable<unknown> {
    return id
      ? this.http.patch<void>(`${LEGISLATIVOS}/${id}`, datos)
      : this.http.post<{ id: number }>(LEGISLATIVOS, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${LEGISLATIVOS}/${id}`);
  }
}
