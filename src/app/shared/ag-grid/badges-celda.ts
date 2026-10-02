import { Component, HostBinding } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface Badge {
  texto: string;
  clase: string;
}

export interface BadgesCellRendererParams extends ICellRendererParams {
  badges: (params: ICellRendererParams) => Badge[];
  centrado?: boolean;
}

@Component({
  selector: 'app-badges-celda',
  standalone: true,
  template: `
    @for (b of badges; track b.texto) {
      <span class="badge" [class]="b.clase">{{ b.texto }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.35rem;
        row-gap: 0.3rem;
        height: 100%;
        padding: 0.3rem 0;
      }

      :host.centrado {
        justify-content: center;
      }

      .badge {
        display: inline-block;
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--brand-muted);
        background: #f1f0f1;
      }

      .badge--ok {
        color: #4c8a1f;
        background: #eaf6df;
      }
      .badge--error {
        color: var(--brand-danger);
        background: #fbeceb;
      }
      .badge--warn {
        color: #9c6a10;
        background: #fdf3e2;
      }
      .badge--info {
        color: #2f6fb0;
        background: #e8f1fa;
      }
      .badge--neutral {
        color: var(--brand-muted);
        background: #f1f0f1;
      }
      .badge--rol-administrador {
        color: var(--brand-primary);
        background: #f8e3ec;
      }
      .badge--rol-analista {
        color: #4c8a1f;
        background: #eaf6df;
      }
      .badge--rol-supervisor {
        color: #2f6fb0;
        background: #e8f1fa;
      }
      .badge--rol-usuario {
        color: var(--brand-muted);
        background: #f1f0f1;
      }
      .badge--pago {
        color: #b8860b;
        background: #fdf3d9;
      }
      .badge--pagado {
        color: #1a8a4a;
        background: #e4f6ea;
      }
    `,
  ],
})
export class BadgesCeldaComponent implements ICellRendererAngularComp {
  protected badges: Badge[] = [];

  @HostBinding('class.centrado')
  protected centrado = false;

  agInit(params: BadgesCellRendererParams): void {
    this.badges = params.badges(params);
    this.centrado = params.centrado ?? false;
  }

  refresh(params: BadgesCellRendererParams): boolean {
    this.badges = params.badges(params);
    this.centrado = params.centrado ?? false;
    return true;
  }
}
