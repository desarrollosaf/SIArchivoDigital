const UMBRAL_ARRASTRE_PX = 4;

/**
 * Permite recorrer una tabla ancha arrastrando con el cursor (como un tablero de Trello),
 * sin quitarle la selección de texto nativa: solo empieza a desplazar una vez que el
 * arrastre supera un pequeño umbral, y hasta entonces un clic normal (botones, selección
 * de texto) se comporta igual que siempre.
 */
export function habilitarArrastreHorizontal(host: HTMLElement): void {
  const viewport = host.querySelector<HTMLElement>('.ag-body-horizontal-scroll-viewport');
  if (!viewport) return;

  let inicioX = 0;
  let inicioScroll = 0;
  let superoUmbral = false;

  const onMouseMove = (event: MouseEvent): void => {
    const deltaX = event.clientX - inicioX;
    if (!superoUmbral) {
      if (Math.abs(deltaX) < UMBRAL_ARRASTRE_PX) return;
      superoUmbral = true;
      window.getSelection()?.removeAllRanges();
      host.classList.add('arrastrando-tabla');
    }
    event.preventDefault();
    viewport.scrollLeft = inicioScroll - deltaX;
  };

  const onMouseUp = (): void => {
    superoUmbral = false;
    host.classList.remove('arrastrando-tabla');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  host.addEventListener('mousedown', (event: MouseEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, .ag-header-cell-resize')) return;

    inicioX = event.clientX;
    inicioScroll = viewport.scrollLeft;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
