import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ConsultasService, ResumenReporte } from '../../core/services/consultas.service';
import { ToastService } from '../../core/services/toast.service';
import { descargarBlob } from '../../shared/descargar-blob';
import { fechaHoyMexico } from '../../shared/utils/fecha-mexico';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes {
  protected readonly desde = signal(`${fechaHoyMexico().slice(0, 4)}-01-01`);
  protected readonly hasta = signal(fechaHoyMexico());
  protected readonly todos = signal(false);
  protected readonly cargando = signal(false);
  protected readonly resumen = signal<ResumenReporte | null>(null);
  protected readonly esAdmin;

  protected readonly porcentajeConcluido = computed(() => {
    const r = this.resumen();
    const vigentes = (r?.total ?? 0) - (r?.cancelados ?? 0);
    return vigentes > 0 ? Math.round(((r?.concluidos ?? 0) / vigentes) * 100) : 0;
  });

  constructor(
    authService: AuthService,
    private readonly consultasService: ConsultasService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
  ) {
    this.esAdmin = authService.currentUser()?.rol === 'administrador';
    this.consultar();
  }

  consultar(): void {
    if (!this.periodoValido()) return;
    this.cargando.set(true);
    this.consultasService.resumenReporte(this.desde(), this.hasta(), this.todos()).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo generar el reporte.');
      },
    });
  }

  descargarExcel(): void {
    if (!this.periodoValido()) return;
    descargarBlob(
      this.http,
      this.consultasService.urlConcentrado(this.desde(), this.hasta(), this.todos()),
      `concentrado_${this.desde()}_${this.hasta()}.xlsx`,
    );
  }

  private periodoValido(): boolean {
    if (!this.desde() || !this.hasta() || this.desde() > this.hasta()) {
      this.toastService.error('Revisa el periodo: la fecha inicial debe ser anterior a la final.');
      return false;
    }
    return true;
  }
}
