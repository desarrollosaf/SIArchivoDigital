import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/comentarios`;

function aFormData(texto: string, archivo: File | null, para?: string | null): FormData {
  const datos = new FormData();
  if (texto.trim()) datos.append('texto', texto.trim());
  if (para) datos.append('para', para);
  if (archivo) datos.append('archivo', archivo);
  return datos;
}

@Injectable({ providedIn: 'root' })
export class ComentariosService {
  constructor(private readonly http: HttpClient) {}

  comentar(
    registroId: number,
    texto: string,
    para: string | null,
    archivo: File | null,
  ): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `${API}/registro/${registroId}`,
      aFormData(texto, archivo, para),
    );
  }

  responder(comentarioId: number, texto: string, archivo: File | null): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(
      `${API}/${comentarioId}/respuestas`,
      aFormData(texto, archivo),
    );
  }

  urlArchivoComentario(id: number): string {
    return `${API}/${id}/archivo`;
  }

  urlArchivoRespuesta(id: number): string {
    return `${API}/respuestas/${id}/archivo`;
  }
}
