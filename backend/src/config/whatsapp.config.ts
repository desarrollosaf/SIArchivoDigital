import { registerAs } from '@nestjs/config';

/**
 * Envío de WhatsApp por UltraMsg (el mismo proveedor que usaba Laravel). Mientras `activo` no sea
 * true no sale ningún mensaje: así el ambiente local y las pruebas no envían por accidente.
 */
export default registerAs('whatsapp', () => ({
  activo: process.env.WHATSAPP_ACTIVO?.trim().toLowerCase() === 'true',
  apiUrl: (
    process.env.ULTRAMSG_API_URL?.trim() || 'https://api.ultramsg.com'
  ).replace(/\/+$/, ''),
  instancia: process.env.ULTRAMSG_INSTANCIA?.trim() || '',
  token: process.env.ULTRAMSG_TOKEN?.trim() || '',
}));
