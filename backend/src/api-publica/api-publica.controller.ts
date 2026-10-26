import { Controller, Get, Query } from '@nestjs/common';
import { ApiPublicaService } from './api-publica.service';

/**
 * API pública (sin sesión) para otros sistemas, igual que la de Laravel (ApiController@index):
 *   GET /Documentacion/backend/api/agenda      (opcional ?mes=AAAA-MM)
 * La URL de Laravel (/Documentacion/api/agenda) sigue sirviendo si el proxy la envía aquí
 * (ver README). Solo lectura; CORS ya está abierto para todo el backend (main.ts).
 */
@Controller('api')
export class ApiPublicaController {
  constructor(private readonly apiPublicaService: ApiPublicaService) {}

  @Get('agenda')
  agenda(@Query('mes') mes?: string) {
    return this.apiPublicaService.agenda(mes);
  }
}
