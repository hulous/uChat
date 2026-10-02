import { HttpErrorResponse } from "@angular/common/http";
import { Component, signal } from "@angular/core";
import { Router } from "@angular/router";

import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-register",
  imports: [FormsModule, RouterLink, TranslateModule],
  templateUrl: "./register.html",
})
export class RegisterComponent {
  name = signal("");
  email = signal("");
  password = signal("");
  errorMessage = signal("");
  isSubmitting = signal(false);

  constructor(
    private readonly authenticationService: AuthService,
    private readonly router: Router,
    private readonly translate: TranslateService,
  ) {}

  submit(): void {
    if (
      this.isSubmitting() ||
      !this.name() ||
      !this.email() ||
      this.password().length < 8
    ) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.authenticationService
      .register({
        name: this.name(),
        email: this.email(),
        password: this.password(),
      })
      .subscribe({
        next: () => this.router.navigate(["/login"]),
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            this.translate.instant(
              error.status === 400
                ? "auth.errors.invalidRegistration"
                : "auth.errors.registrationUnavailable",
            ),
          );
        },
      });
  }
}
