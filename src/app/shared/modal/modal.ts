import { Component, HostListener, input, output } from '@angular/core';

/** Ventana modal ligera (sin depender del JS de Bootstrap). El contenido se proyecta. */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="modal-fondo" (mousedown)="onFondo($event)">
      <div
        class="modal-caja"
        [class.modal-caja--ancha]="ancho() === 'ancho'"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
      >
        <header class="modal-caja__encabezado">
          <h2>{{ titulo() }}</h2>
          <button
            type="button"
            class="modal-caja__cerrar"
            (click)="cerrar.emit()"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>
        <div class="modal-caja__cuerpo">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-fondo {
        position: fixed;
        inset: 0;
        z-index: 1050;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 6vh 1rem 1rem;
        overflow-y: auto;
        background: rgba(20, 4, 12, 0.5);
        backdrop-filter: blur(2px);
      }

      .modal-caja {
        width: 100%;
        max-width: 560px;
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
        animation: modal-entrada 0.18s ease-out;
      }

      .modal-caja--ancha {
        max-width: 760px;
      }

      .modal-caja__encabezado {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 1.4rem;
        border-bottom: 1px solid var(--brand-border);
      }

      .modal-caja__encabezado h2 {
        margin: 0;
        font-size: 1.05rem;
        color: var(--brand-ink);
      }

      .modal-caja__cerrar {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: none;
        color: var(--brand-muted);
        cursor: pointer;
      }

      .modal-caja__cerrar:hover {
        background: var(--brand-bg);
        color: var(--brand-ink);
      }

      .modal-caja__cerrar svg {
        width: 18px;
        height: 18px;
      }

      .modal-caja__cuerpo {
        padding: 1.25rem 1.4rem 1.4rem;
      }

      @keyframes modal-entrada {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    `,
  ],
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly ancho = input<'normal' | 'ancho'>('normal');
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar.emit();
  }

  onFondo(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cerrar.emit();
  }
}
