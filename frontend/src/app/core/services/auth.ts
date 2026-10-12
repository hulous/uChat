import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { LoginCredentials } from "../models/login-request.interface";
import { LoginResponse } from "../models/login-response.interface";
import { RegisterRequest } from "../models/register-request.interface";
import { UserResponse } from "../models/user-response.interface";
import { StoredAuthentication } from "../models/stored-authentication.interface";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly storageKey = "uchat.authentication";
  private readonly loginUrl = "/api/auth/login";

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, credentials).pipe(
      tap((response) => {
        this.storeAuthentication({
          ...response,
          email: credentials.email,
          expiresAt: Date.now() + response.expiresIn,
        });
      }),
    );
  }

  register(request: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>("/api/auth/register", request);
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }

  getToken(): string | null {
    return this.getStoredAuthentication()?.token ?? null;
  }

  getEmail(): string | null {
    return this.getStoredAuthentication()?.email ?? null;
  }

  getCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>("/api/auth/me");
  }

  updateCurrentUser(request: {
    name: string;
    email: string;
    password?: string;
  }): Observable<UserResponse> {
    return this.http.put<UserResponse>("/api/auth/me", request).pipe(
      tap((response) => {
        if (response.token && response.expiresIn !== undefined) {
          this.storeAuthentication({
            token: response.token,
            expiresIn: response.expiresIn,
            email: response.email,
            expiresAt: Date.now() + response.expiresIn,
          });
        }
      }),
    );
  }

  isAuthenticated(): boolean {
    const storedAuthentication = this.getStoredAuthentication();
    return Boolean(
      storedAuthentication?.token &&
      storedAuthentication.expiresAt > Date.now(),
    );
  }

  private storeAuthentication(authentication: StoredAuthentication): void {
    localStorage.setItem(this.storageKey, JSON.stringify(authentication));
  }

  private getStoredAuthentication(): StoredAuthentication | null {
    const storedAuthentication = localStorage.getItem(this.storageKey);
    if (!storedAuthentication) {
      return null;
    }

    try {
      return JSON.parse(storedAuthentication) as StoredAuthentication;
    } catch {
      this.logout();
      return null;
    }
  }
}
