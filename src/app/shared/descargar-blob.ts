import { HttpClient } from '@angular/common/http';

/** Descarga un archivo generado por el backend (blob autenticado) con el nombre indicado. */
export function descargarBlob(http: HttpClient, url: string, nombreArchivo: string) {
  return http.get(url, { responseType: 'blob' }).subscribe((blob) => {
    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = objectUrl;
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(objectUrl);
  });
}
