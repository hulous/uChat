import { Component, signal } from "@angular/core";
import { Router } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-login",
  imports: [FormsModule, RouterLink, TranslateModule],
  templateUrl: "./login.html",
})
export class LoginComponent {
  email = signal("");
  password = signal("");
  errorMessage = signal("");
  isSubmitting = signal(false);

  constructor(
    private readonly authenticationService: AuthService,
    private readonly router: Router,
    private readonly translate?: TranslateService,
  ) {}

  submit(): void {
    if (this.isSubmitting() || !this.email() || !this.password()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.authenticationService
      .login({ email: this.email(), password: this.password() })
      .subscribe({
        next: () => {
          this.router.navigateByUrl("/chat/rooms");
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            this.translateError(
              error.status === 401
                ? "auth.errors.invalidCredentials"
                : "auth.errors.loginUnavailable",
            ),
          );
        },
      });
  }

  private translateError(key: string): string {
    return (
      this.translate?.instant(key) ??
      (key === "auth.errors.invalidCredentials"
        ? "Adresse email ou mot de passe incorrect."
        : "La connexion est momentanément indisponible.")
    );
  }
}
