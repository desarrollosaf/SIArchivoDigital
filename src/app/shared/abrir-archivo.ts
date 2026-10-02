import { HttpClient } from '@angular/common/http';

/**
 * Abre en otra pestaña un documento que el backend entrega solo con token (no son estáticos).
 * La pestaña se abre antes de la petición, dentro del clic, para que el navegador no la bloquee.
 */
export function abrirArchivo(http: HttpClient, url: string, alFallar?: () => void): void {
  const ventana = window.open('', '_blank');
  http.get(url, { responseType: 'blob' }).subscribe({
    next: (blob) => {
      const objectUrl = URL.createObjectURL(blob);
      if (ventana) {
        ventana.location.href = objectUrl;
      } else {
        window.open(objectUrl, '_blank');
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    },
    error: () => {
      ventana?.close();
      alFallar?.();
    },
  });
}
