import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  rfc: string;
  email: string | null;
  nombre: string | null;
  puesto: string | null;
  path_foto: string | null;
  cambio_contrasena: boolean;
  rol: string;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'siad_token';
const USER_KEY = 'siad_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  constructor(private readonly http: HttpClient) {}

  login(rfc: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { rfc, password })
      .pipe(
        tap(({ access_token, user }) => {
          localStorage.setItem(TOKEN_KEY, access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this.currentUser.set(user);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
