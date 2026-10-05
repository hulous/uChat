import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../core/services/auth";
import { UserNavigationComponent } from "../../shared/user-navigation/user-navigation";

@Component({
  selector: "app-account",
  imports: [FormsModule, TranslateModule, UserNavigationComponent],
  templateUrl: "./account.html",
})
export class AccountComponent implements OnInit {
  name = "";
  email = "";
  password = "";
  isLoading = signal(true);
  isSubmitting = signal(false);
  message = signal("");
  errorMessage = signal("");

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.name = user.name;
        this.email = user.email;
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant("account.errors.load"));
        this.isLoading.set(false);
      },
    });
  }

  submit(): void {
    if (this.isSubmitting() || !this.name.trim() || !this.email.trim()) return;
    this.isSubmitting.set(true);
    this.message.set("");
    this.errorMessage.set("");
    this.authService.updateCurrentUser({
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
    }).subscribe({
      next: (user) => {
        this.name = user.name;
        this.email = user.email;
        this.password = "";
        this.message.set(this.translate.instant("account.saved"));
        this.isSubmitting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.status === 400
          ? this.translate.instant("account.errors.invalid")
          : this.translate.instant("account.errors.save"));
        this.isSubmitting.set(false);
      },
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(["/login"]);
  }
}
