import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icono } from '../icono/icono';

/** Paginador de las bandejas (el mismo de SIIntranetD). */
@Component({
  selector: 'app-paginador',
  standalone: true,
  imports: [Icono],
  template: `
    <div class="paginador">
      <button class="btn-i btn-i-line btn-i-sm" [disabled]="paginaActual() === 1" (click)="ir(paginaActual() - 1)">
        <app-icono name="flecha" style="transform: rotate(180deg)" /> Anterior
      </button>
      @for (p of paginas(); track $index) {
        @if (p === '…') {
          <span class="pag-elipsis">…</span>
        } @else {
          <button type="button" class="pag-num" [class.on]="p === paginaActual()" (click)="ir(p)">{{ p }}</button>
        }
      }
      <button class="btn-i btn-i-line btn-i-sm" [disabled]="paginaActual() === totalPaginas()" (click)="ir(paginaActual() + 1)">
        Siguiente <app-icono name="flecha" />
      </button>
    </div>
  `,
  styles: [
    `
      .paginador {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
      }
      .pag-num {
        min-width: 32px;
        height: 32px;
        padding: 0 4px;
        border: 1.5px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--gris);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .pag-num:hover {
        background: #f6f1f3;
        color: var(--vino);
      }
      .pag-num.on {
        background: var(--vino);
        border-color: var(--vino);
        color: #fff;
      }
      .pag-elipsis {
        padding: 0 2px;
        color: var(--gris);
        font-weight: 700;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginador {
  readonly paginaActual = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly cambiarPagina = output<number>();

  /** Primera y última página, más una ventana alrededor de la actual; lo demás se colapsa en "…". */
  protected readonly paginas = computed<(number | '…')[]>(() => {
    const actual = this.paginaActual();
    const total = this.totalPaginas();
    const izquierda = Math.max(2, actual - 1);
    const derecha = Math.min(total - 1, actual + 1);
    const rango: (number | '…')[] = [1];
    if (izquierda > 2) rango.push('…');
    for (let i = izquierda; i <= derecha; i++) rango.push(i);
    if (derecha < total - 1) rango.push('…');
    if (total > 1) rango.push(total);
    return rango;
  });

  protected ir(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas() || pagina === this.paginaActual()) return;
    this.cambiarPagina.emit(pagina);
  }
}
