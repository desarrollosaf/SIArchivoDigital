import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { ETIQUETA_TIPO_ARCHIVO, TipoArchivo, tipoArchivoPorNombre } from '../utils/tipo-archivo';

export type { TipoArchivo };

let nextId = 0;

interface PreviewItem {
  file: File;
  url: string;
  tipo: TipoArchivo;
}

export type FileUploadBadgeTono = 'exito' | 'error' | 'advertencia' | 'progreso' | 'neutral';

export interface FileUploadBadge {
  tono: FileUploadBadgeTono;
  titulo: string;
  detalle?: string | null;
}

function detectarTipo(file: File): TipoArchivo {
  if (file.type.startsWith('image/')) return 'imagen';
  return tipoArchivoPorNombre(file.name);
}

const ETIQUETAS = ETIQUETA_TIPO_ARCHIVO;

@Component({
  selector: 'app-file-upload',
  standalone: true,
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  readonly accept = input<string>('');
  readonly multiple = input(true);
  readonly files = input<File[]>([]);
  /** 'grid' (por defecto): miniaturas cuadradas. 'list': tarjetas en fila, con nombre y tipo de archivo visibles. */
  readonly variant = input<'grid' | 'list'>('grid');
  /** false: oculta la lista de previews (el consumidor la dibuja a su manera, p. ej. agrupada). */
  readonly mostrarLista = input<boolean>(true);
  /** Estado opcional por archivo (clave = nombre exacto del archivo), p. ej. verificación SAT. */
  readonly badges = input<Record<string, FileUploadBadge>>({});

  readonly filesChange = output<File[]>();

  protected readonly inputId = `file-upload-${nextId++}`;
  protected readonly previews = signal<PreviewItem[]>([]);
  protected readonly etiquetas = ETIQUETAS;

  private objectUrls: string[] = [];

  constructor() {
    effect(() => {
      const files = this.files();
      this.revokeUrls();

      this.previews.set(
        files.map((file) => {
          const url = URL.createObjectURL(file);
          this.objectUrls.push(url);
          return { file, url, tipo: detectarTipo(file) };
        }),
      );
    });

    inject(DestroyRef).onDestroy(() => this.revokeUrls());
  }

  onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nuevos = input.files ? Array.from(input.files) : [];
    this.filesChange.emit([...this.files(), ...nuevos]);
    input.value = '';
  }

  quitar(item: PreviewItem): void {
    this.filesChange.emit(this.files().filter((f) => f !== item.file));
  }

  private revokeUrls(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }
}
