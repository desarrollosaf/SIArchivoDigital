import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { AgendaPresidenciaModule } from '../agenda-presidencia/agenda-presidencia.module';
import { AvisosWhatsappController } from './avisos-whatsapp.controller';
import { AvisosCumpleanosService } from './avisos-cumpleanos.service';
import { CumpleanosPdfService } from './cumpleanos-pdf.service';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [CompartidoModule, AgendaPresidenciaModule],
  controllers: [AvisosWhatsappController],
  providers: [AvisosCumpleanosService, CumpleanosPdfService, WhatsappService],
})
export class AvisosWhatsappModule {}
