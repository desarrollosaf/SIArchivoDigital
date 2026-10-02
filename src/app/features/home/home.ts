import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ResumenTurnos, TurnosService } from '../../core/services/turnos.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly user;
  protected readonly resumen = signal<ResumenTurnos | null>(null);
  protected readonly error = signal(false);

  constructor(authService: AuthService, turnosService: TurnosService) {
    this.user = authService.currentUser;
    turnosService.resumen().subscribe({
      next: (r) => this.resumen.set(r),
      error: () => this.error.set(true),
    });
  }
}
