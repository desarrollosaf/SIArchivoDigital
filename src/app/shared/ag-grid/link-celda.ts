import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export type IconoAccion = 'flecha' | 'lapiz' | 'ojo';
export type ColorAccion = 'azul' | 'ambar';

export interface LinkCellRendererParams extends ICellRendererParams {
  label: string | ((data: unknown) => string);
  icono?: IconoAccion | ((data: unknown) => IconoAccion);
  color?: ColorAccion | ((data: unknown) => ColorAccion);
  routerLink: (params: ICellRendererParams) => unknown[];
  visible?: (data: unknown) => boolean;
}

@Component({
  selector: 'app-link-celda',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visible) {
      <a class="accion" [class.accion--ambar]="color === 'ambar'" [routerLink]="link">
        <span class="accion__icono">
          @if (icono === 'lapiz') {
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          } @else if (icono === 'ojo') {
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        </span>
        <span class="accion__texto">{{ label }}</span>
      </a>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      .accion {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.15rem 0.65rem 0.15rem 0.15rem;
        border-radius: 999px;
        background: transparent;
        color: #2f6fb0;
        font-size: 0.74rem;
        font-weight: 700;
        text-decoration: none;
        transition: background 0.18s ease;
      }

      .accion__icono {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #e8f1fa;
        color: #2f6fb0;
        flex-shrink: 0;
        transition:
          background 0.18s ease,
          color 0.18s ease,
          transform 0.18s ease;
      }

      .accion__icono svg {
        width: 12px;
        height: 12px;
        transition: transform 0.18s ease;
      }

      .accion:hover {
        background: #f0f6fc;
      }

      .accion:hover .accion__icono {
        background: #2f6fb0;
        color: #fff;
        transform: scale(1.1);
      }

      .accion:hover .accion__icono svg {
        transform: translateX(1px);
      }

      .accion:active .accion__icono {
        transform: scale(0.96);
      }

      .accion--ambar {
        color: #a16207;
      }

      .accion--ambar .accion__icono {
        background: #fef3c7;
        color: #a16207;
      }

      .accion--ambar:hover {
        background: #fefaf0;
      }

      .accion--ambar:hover .accion__icono {
        background: #a16207;
        color: #fff;
      }
    `,
  ],
})
export class LinkCeldaComponent implements ICellRendererAngularComp {
  protected label = '';
  protected icono: IconoAccion = 'flecha';
  protected color: ColorAccion = 'azul';
  protected link: unknown[] = [];
  protected visible = true;

  agInit(params: LinkCellRendererParams): void {
    this.label = typeof params.label === 'function' ? params.label(params.data) : params.label;
    const icono = params.icono ?? 'flecha';
    this.icono = typeof icono === 'function' ? icono(params.data) : icono;
    const color = params.color ?? 'azul';
    this.color = typeof color === 'function' ? color(params.data) : color;
    this.link = params.routerLink(params);
    this.visible = params.visible ? params.visible(params.data) : true;
  }

  refresh(params: LinkCellRendererParams): boolean {
    this.agInit(params);
    return true;
  }
}
