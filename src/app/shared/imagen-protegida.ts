import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

/**
 * Las fotos (perfil, gabinete) las entrega el backend solo con token, así que no sirven en un
 * `<img src>` directo: se descargan y se muestran como object URL. Quien la usa debe liberarla
 * con `URL.revokeObjectURL` al reemplazarla. Si no hay foto, regresa null.
 */
export function cargarImagen(http: HttpClient, url: string): Observable<string | null> {
  return http.get(url, { responseType: 'blob' }).pipe(
    map((blob) => URL.createObjectURL(blob)),
    catchError(() => of(null)),
  );
}
