import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PerfilDatos {
  rfc: string;
  email: string;
  cel: string;
  /** Quiere avisos por WhatsApp de los turnos que recibe. */
  whats: boolean;
  tieneFoto: boolean;
}

const API = `${environment.apiUrl}/perfil`;

@Injectable({ providedIn: 'root' })
export class PerfilService {
  readonly urlFoto = `${API}/foto`;

  constructor(private readonly http: HttpClient) {}

  datos(): Observable<PerfilDatos> {
    return this.http.get<PerfilDatos>(API);
  }

  guardar(datos: { email: string; cel: string; whats: boolean }): Observable<PerfilDatos> {
    return this.http.patch<PerfilDatos>(API, datos);
  }

  subirFoto(foto: File): Observable<PerfilDatos> {
    const form = new FormData();
    form.append('foto', foto);
    return this.http.post<PerfilDatos>(this.urlFoto, form);
  }

  cambiarContrasena(actual: string, nueva: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API}/contrasena`, { actual, nueva });
  }
}
