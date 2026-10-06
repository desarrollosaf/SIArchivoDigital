import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Persona } from './catalogos.service';

export type EstatusRegistro = 'Pendiente' | 'Concluido' | 'Cancelado';
export type FiltroEstatus = 'pendientes' | 'concluidos' | 'cancelados' | 'todos';
export type TipoTurno = 'A' | 'C';

export interface RegistroListado {
  id: number;
  folio: string;
  referencia: string | null;
  asunto: string;
  indicaciones: string;
  remitente: string;
  tipo: string;
  urgente: boolean;
  fechaRecepcion: string;
  fechaLimite: string;
  creado: string;
  estatus: EstatusRegistro;
  diasRestantes: number | null;
  tieneArchivo: boolean;
  turnos: { nombre: string; tipo: TipoTurno; atendido: boolean }[];
}

export interface ContextoNuevoRegistro {
  folio: string | null;
  fechaHoy: string;
  departamento: string | null;
  sinDepartamento: boolean;
}

export interface TurnoDetalle {
  id: number;
  rfc: string;
  nombre: string | null;
  /** "DIRECCIÓN …/PUESTO" del padrón. */
  cargo: string | null;
  tipo: TipoTurno;
  atendido: boolean;
  visto: boolean;
  activo: boolean;
  indicaciones: string | null;
  turnadoPor: { rfc: string; nombre: string | null } | null;
  comentarioConclusion: string | null;
  tieneConclusion: boolean;
  fecha: string;
  puedeCancelar: boolean;
}

export interface Autor {
  rfc: string;
  nombre: string | null;
}

export interface ComentarioDetalle {
  id: number;
  autor: Autor;
  para: Autor | null;
  texto: string | null;
  tieneArchivo: boolean;
  fecha: string;
  respuestas: {
    id: number;
    autor: Autor;
    texto: string | null;
    tieneArchivo: boolean;
    fecha: string;
  }[];
}

export interface RegistroDetalle {
  id: number;
  folio: string;
  folioRastreo: { id: number; folio: string } | null;
  fechaRecepcion: string;
  fechaDocumento: string | null;
  referenciaDocumento: string | null;
  fechaLimiteAtencion: string;
  horaInicio: string | null;
  horaTermino: string | null;
  tipoAtencion: { id: number; nombre: string };
  serie: { id: number; nombre: string };
  indicaciones: string;
  asunto: string;
  remitente: { rfc: string; nombre: string };
  otroRemitente: string | null;
  fojas: number | null;
  tipoSolicitud: number | null;
  salon: number | null;
  nombreEvento: string | null;
  registradoPor: { rfc: string; nombre: string } | null;
  creado: string;
  estatus: EstatusRegistro;
  diasRestantes: number | null;
  tieneArchivo: boolean;
  destinatariosRegistro: { atencion: Persona[]; conocimiento: Persona[] };
  turnos: TurnoDetalle[];
  comentarios: ComentarioDetalle[];
  permisos: {
    soloLectura: boolean;
    editar: boolean;
    cancelar: boolean;
    comentar: boolean;
    miTurno: { id: number; tipo: TipoTurno; atendido: boolean } | null;
  };
}

/** Campos del formulario de captura; se envían como multipart junto con el archivo. */
export interface RegistroPayload {
  fechaRecepcion: string;
  fechaDocumento?: string;
  referenciaDocumento?: string;
  fechaLimiteAtencion: string;
  horaInicio?: string;
  horaTermino?: string;
  tipoAtencion: number;
  serieId: number;
  tituloDoc: string;
  descripcionDoc: string;
  remitenteRfc: string;
  otroRemitente?: string;
  fojas?: number;
  tipoSolicitud?: number;
  salon?: number;
  nombreEvento?: string;
  folioRastreo?: number;
  atencion: string[];
  conocimiento: string[];
}

const API = `${environment.apiUrl}/registros`;

function aFormData(payload: RegistroPayload, archivo: File | null): FormData {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(payload)) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (Array.isArray(valor)) {
      valor.forEach((v) => datos.append(clave, String(v)));
    } else {
      datos.append(clave, String(valor));
    }
  }
  if (archivo) datos.append('archivo', archivo);
  return datos;
}

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  constructor(private readonly http: HttpClient) {}

  listar(anio: number, mes: number | null, estatus: FiltroEstatus): Observable<RegistroListado[]> {
    let params = new HttpParams().set('anio', anio).set('estatus', estatus);
    if (mes) params = params.set('mes', mes);
    return this.http.get<RegistroListado[]>(API, { params });
  }

  buscar(q: string): Observable<RegistroListado[]> {
    return this.http.get<RegistroListado[]>(`${API}/buscar`, { params: { q } });
  }

  rastreables(search: string): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${API}/rastreables`, { params: { search } });
  }

  contextoNuevo(): Observable<ContextoNuevoRegistro> {
    return this.http.get<ContextoNuevoRegistro>(`${API}/nuevo/contexto`);
  }

  detalle(id: number): Observable<RegistroDetalle> {
    return this.http.get<RegistroDetalle>(`${API}/${id}`);
  }

  crear(payload: RegistroPayload, archivo: File | null): Observable<{ id: number; folio: string }> {
    return this.http.post<{ id: number; folio: string }>(API, aFormData(payload, archivo));
  }

  editar(id: number, payload: RegistroPayload, archivo: File | null): Observable<void> {
    return this.http.patch<void>(`${API}/${id}`, aFormData(payload, archivo));
  }

  cancelar(id: number): Observable<void> {
    return this.http.post<void>(`${API}/${id}/cancelar`, {});
  }

  urlArchivo(id: number): string {
    return `${API}/${id}/archivo`;
  }
}
