import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ResultadoEnvio {
  telefono: string;
  ok: boolean;
  detalle?: string;
}

interface ConfigWhatsapp {
  activo: boolean;
  apiUrl: string;
  instancia: string;
  token: string;
}

const TIEMPO_ESPERA_MS = 30_000;

/**
 * Envía mensajes de WhatsApp por UltraMsg (mismo proveedor y endpoints que Laravel:
 * messages/chat y messages/document). Las credenciales vienen del .env, no del código.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  private get cfg(): ConfigWhatsapp {
    return this.config.get<ConfigWhatsapp>('whatsapp')!;
  }

  /** Activo y con instancia y token capturados. */
  estado() {
    const { activo, instancia, token } = this.cfg;
    return { activo, configurado: !!instancia && !!token };
  }

  puedeEnviar(): boolean {
    const e = this.estado();
    return e.activo && e.configurado;
  }

  enviarTexto(telefono: string, texto: string): Promise<ResultadoEnvio> {
    return this.enviar('chat', telefono, { body: texto });
  }

  enviarDocumento(
    telefono: string,
    pdf: Buffer,
    nombreArchivo: string,
    leyenda: string,
  ): Promise<ResultadoEnvio> {
    return this.enviar('document', telefono, {
      document: `data:application/pdf;base64,${pdf.toString('base64')}`,
      filename: nombreArchivo,
      caption: leyenda,
    });
  }

  private async enviar(
    tipo: 'chat' | 'document',
    telefono: string,
    campos: Record<string, string>,
  ): Promise<ResultadoEnvio> {
    const { apiUrl, instancia, token } = this.cfg;
    if (!this.puedeEnviar()) {
      return {
        telefono,
        ok: false,
        detalle: 'El envío de WhatsApp está desactivado',
      };
    }
    try {
      const respuesta = await fetch(`${apiUrl}/${instancia}/messages/${tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, to: `+52${telefono}`, ...campos }),
        signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
      });
      const texto = await respuesta.text();
      let error: string | undefined;
      try {
        const json = JSON.parse(texto) as { error?: unknown; sent?: unknown };
        if (json.error) error = JSON.stringify(json.error);
      } catch {
        if (!respuesta.ok) error = texto.slice(0, 200);
      }
      if (!respuesta.ok && !error) error = `HTTP ${respuesta.status}`;
      if (error) {
        this.logger.warn(`WhatsApp (${tipo}) a ${telefono} falló: ${error}`);
        return { telefono, ok: false, detalle: error };
      }
      this.logger.log(`WhatsApp (${tipo}) enviado a ${telefono}`);
      return { telefono, ok: true };
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      this.logger.warn(`WhatsApp (${tipo}) a ${telefono} falló: ${detalle}`);
      return { telefono, ok: false, detalle };
    }
  }
}
