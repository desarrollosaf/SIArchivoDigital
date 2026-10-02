import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AdministracionService, Grupo } from '../../../core/services/administracion.service';
import { Persona } from '../../../core/services/catalogos.service';
import { ToastService } from '../../../core/services/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { PersonaPicker } from '../../../shared/persona-picker/persona-picker';

@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [FormsModule, Modal, PersonaPicker],
  templateUrl: './grupos.html',
  styleUrl: './grupos.scss',
})
export class Grupos {
  protected readonly grupos = signal<Grupo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly editando = signal<{ id: number | null } | null>(null);
  protected readonly nombre = signal('');
  protected readonly miembros = signal<Persona[]>([]);
  protected readonly guardando = signal(false);

  constructor(
    private readonly administracionService: AdministracionService,
    private readonly toastService: ToastService,
  ) {
    this.cargar();
  }

  nuevo(): void {
    this.nombre.set('');
    this.miembros.set([]);
    this.editando.set({ id: null });
  }

  editar(g: Grupo): void {
    this.nombre.set(g.grupo);
    this.miembros.set(g.miembros.map((m) => ({ id: m.rfc, nombre: m.nombre })));
    this.editando.set({ id: g.id });
  }

  guardar(): void {
    const edicion = this.editando();
    if (!edicion) return;
    if (!this.nombre().trim() || this.miembros().length === 0) {
      this.toastService.error('El grupo necesita nombre y al menos un integrante.');
      return;
    }
    this.guardando.set(true);
    this.administracionService
      .guardarGrupo(edicion.id, {
        grupo: this.nombre().trim(),
        miembros: this.miembros().map((m) => m.id),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.editando.set(null);
          this.toastService.success('Grupo guardado.');
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toastService.error(
            err.status === 400 ? 'Revisa los datos del grupo.' : 'No se pudo guardar el grupo.',
          );
        },
      });
  }

  eliminar(g: Grupo): void {
    void Swal.fire({
      title: '¿Eliminar este grupo?',
      text: `"${g.grupo}" dejará de aparecer como destinatario. Los turnos ya enviados no cambian.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.administracionService.eliminarGrupo(g.id).subscribe({
        next: () => {
          this.toastService.success('Grupo eliminado.');
          this.cargar();
        },
        error: () => this.toastService.error('No se pudo eliminar el grupo.'),
      });
    });
  }

  private cargar(): void {
    this.administracionService.grupos().subscribe({
      next: (rows) => {
        this.grupos.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudieron cargar los grupos.');
      },
    });
  }
}
