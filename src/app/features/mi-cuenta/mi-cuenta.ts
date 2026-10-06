import { Component, OnDestroy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { ToastService } from '../../core/services/toast.service';
import { cargarImagen } from '../../shared/imagen-protegida';

function mensajeError(err: HttpErrorResponse, porDefecto: string): string {
  const mensaje = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join(' · ');
  return mensaje || porDefecto;
}

/** Reglas de la contraseña (las mismas que valida el backend, como en Laravel). */
const REGLAS = [
  { texto: 'Al menos 8 caracteres', cumple: (c: string) => c.length >= 8 },
  { texto: 'Una mayúscula', cumple: (c: string) => /[A-Z]/.test(c) },
  { texto: 'Una minúscula', cumple: (c: string) => /[a-z]/.test(c) },
  { texto: 'Un número', cumple: (c: string) => /\d/.test(c) },
  { texto: 'Un carácter especial (p. ej. ! # $ %)', cumple: (c: string) => /[^\w]/.test(c) },
];

/**
 * Datos de la cuenta del usuario: foto, datos de contacto, aviso por WhatsApp, contraseña y manual
 * (en Laravel: "Datos de contacto" y "Cambiar contraseña" del menú de usuario).
 */
@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss',
})
export class MiCuenta implements OnDestroy {
  protected readonly user;
  protected readonly cargando = signal(true);

  // Datos de contacto
  protected readonly email = signal('');
  protected readonly email2 = signal('');
  protected readonly cel = signal('');
  protected readonly cel2 = signal('');
  protected readonly whats = signal(false);
  protected readonly guardandoDatos = signal(false);
  private readonly emailOriginal = signal('');
  private readonly celOriginal = signal('');

  // Foto
  protected readonly foto = signal<string | null>(null);
  protected readonly subiendoFoto = signal(false);

  // Contraseña
  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly confirmacion = signal('');
  protected readonly verContrasenas = signal(false);
  protected readonly guardandoClave = signal(false);
  protected readonly reglas = computed(() =>
    REGLAS.map((r) => ({ texto: r.texto, ok: r.cumple(this.nueva()) })),
  );
  protected readonly claveValida = computed(
    () =>
      !!this.actual() && this.reglas().every((r) => r.ok) && this.nueva() === this.confirmacion(),
  );

  /** Si cambia el correo o el teléfono, se pide confirmarlo (como en Laravel). */
  protected readonly pideConfirmarEmail = computed(
    () => this.email().trim() !== this.emailOriginal(),
  );
  protected readonly pideConfirmarCel = computed(() => this.cel().trim() !== this.celOriginal());

  constructor(
    private readonly perfilService: PerfilService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
    authService: AuthService,
  ) {
    this.user = authService.currentUser;
    this.perfilService.datos().subscribe({
      next: (d) => {
        this.emailOriginal.set(d.email);
        this.celOriginal.set(d.cel);
        this.email.set(d.email);
        this.cel.set(d.cel);
        this.whats.set(d.whats);
        this.cargando.set(false);
        if (d.tieneFoto) this.cargarFoto();
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudieron cargar tus datos.');
      },
    });
  }

  ngOnDestroy(): void {
    const actual = this.foto();
    if (actual) URL.revokeObjectURL(actual);
  }

  iniciales(): string {
    const nombre = this.user()?.nombre ?? '';
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  onFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!/\.(jpe?g|png)$/i.test(archivo.name)) {
      this.toastService.error('La foto debe ser JPG o PNG.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.toastService.error('La foto no debe pesar más de 5 MB.');
      return;
    }
    this.subiendoFoto.set(true);
    this.perfilService.subirFoto(archivo).subscribe({
      next: () => {
        this.subiendoFoto.set(false);
        this.toastService.success('Foto actualizada.');
        this.cargarFoto();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoFoto.set(false);
        this.toastService.error(mensajeError(err, 'No se pudo subir la foto.'));
      },
    });
  }

  guardarDatos(): void {
    const email = this.email().trim();
    const cel = this.cel().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.toastService.error('Escribe un correo electrónico válido.');
      return;
    }
    if (!/^\d{10}$/.test(cel)) {
      this.toastService.error('El teléfono debe tener 10 dígitos.');
      return;
    }
    if (this.pideConfirmarEmail() && email !== this.email2().trim()) {
      this.toastService.error('Los correos electrónicos no coinciden.');
      return;
    }
    if (this.pideConfirmarCel() && cel !== this.cel2().trim()) {
      this.toastService.error('Los números de teléfono no coinciden.');
      return;
    }
    this.guardandoDatos.set(true);
    this.perfilService.guardar({ email, cel, whats: this.whats() }).subscribe({
      next: (d) => {
        this.guardandoDatos.set(false);
        this.emailOriginal.set(d.email);
        this.celOriginal.set(d.cel);
        this.email2.set('');
        this.cel2.set('');
        this.toastService.success('Datos de contacto guardados.');
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoDatos.set(false);
        this.toastService.error(mensajeError(err, 'No se pudieron guardar tus datos.'));
      },
    });
  }

  cambiarContrasena(): void {
    if (!this.claveValida()) {
      this.toastService.error(
        this.nueva() !== this.confirmacion()
          ? 'La confirmación no coincide con la nueva contraseña.'
          : 'Revisa los requisitos de la nueva contraseña.',
      );
      return;
    }
    this.guardandoClave.set(true);
    this.perfilService.cambiarContrasena(this.actual(), this.nueva()).subscribe({
      next: () => {
        this.guardandoClave.set(false);
        this.actual.set('');
        this.nueva.set('');
        this.confirmacion.set('');
        this.toastService.success('Contraseña actualizada. Úsala la próxima vez que entres.');
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoClave.set(false);
        this.toastService.error(mensajeError(err, 'No se pudo cambiar la contraseña.'));
      },
    });
  }

  private cargarFoto(): void {
    cargarImagen(this.http, this.perfilService.urlFoto).subscribe((url) => {
      const anterior = this.foto();
      if (anterior) URL.revokeObjectURL(anterior);
      this.foto.set(url);
    });
  }
}
