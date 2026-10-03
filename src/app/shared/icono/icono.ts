import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Íconos de las bandejas (los mismos trazos que usa SIIntranetD). */
const ICONOS: Record<string, string> = {
  bandeja:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13l2-9h12l2 9M4 13v6h16v-6M4 13h5l1 2h4l1-2h5"/></svg>',
  entrada:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7h16v-7M12 3v11M8 10l4 4 4-4"/></svg>',
  salida:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7h16v-7M12 14V3M8 7l4-4 4 4"/></svg>',
  buscar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-11"/></svg>',
  doblecheck:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12.5l4.5 4.5L14 8"/><path d="M8 12.5l4.5 4.5L22 8"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ojo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  nuevo:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  flecha:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  expediente:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 14h6M9 18h6"/></svg>',
  usuarios:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="8" r="2.5"/></svg>',
};

@Component({
  selector: 'app-icono',
  standalone: true,
  template: `<span class="ico" [innerHTML]="svg()"></span>`,
  styles: [
    `
      :host,
      .ico {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .ico ::ng-deep svg {
        width: 1em;
        height: 1em;
      }
      :host {
        font-size: inherit;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icono {
  readonly name = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONOS[this.name()] ?? ''),
  );
}
