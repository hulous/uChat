import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly publicAuthUrls = ["/api/auth/login", "/api/auth/register"];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    if (!token || this.publicAuthUrls.includes(request.url)) {
      return next.handle(request);
    }

    return next
      .handle(
        request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
      )
      .pipe(
        catchError((error) => {
          if (error.status === 401) {
            this.authService.logout();
            void this.router.navigate(["/login"]);
          }
          return throwError(() => error);
        }),
      );
  }
}
