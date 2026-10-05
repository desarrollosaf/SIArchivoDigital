import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CumpleDiputado {
  nombre: string;
  dia: number;
}

export interface CumpleGabinete {
  nombre: string;
  cargo: string | null;
  dia: number;
  /** 0 = Gobierno del Estado de México, 1 = Congreso del Estado de México. */
  tipo: 0 | 1;
}

export interface CumpleanosMes {
  anio: number;
  /** 1 a 12. */
  mes: number;
  diputados: CumpleDiputado[];
  gabinete: CumpleGabinete[];
}

export interface ResumenCumpleanos {
  /** Mes en curso, de hoy en adelante. */
  actual: CumpleanosMes;
  siguiente: CumpleanosMes;
}

/** "actual", "siguiente" o 1 a 12. */
export type MesCumpleanos = 'actual' | 'siguiente' | number;

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const API = `${environment.apiUrl}/cumpleanos`;

@Injectable({ providedIn: 'root' })
export class CumpleanosService {
  constructor(private readonly http: HttpClient) {}

  resumen(): Observable<ResumenCumpleanos> {
    return this.http.get<ResumenCumpleanos>(API);
  }

  mes(mes: MesCumpleanos): Observable<CumpleanosMes> {
    return this.http.get<CumpleanosMes>(`${API}/mes/${mes}`);
  }
}
