import { Component } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "./core/services/auth";
import { UserNavigationComponent } from "./shared/user-navigation/user-navigation";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, TranslateModule, UserNavigationComponent],
  templateUrl: "./app.component.html",
})
export class AppComponent {
  constructor(
    private readonly translate: TranslateService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.setLanguage(localStorage.getItem("uchat.language") ?? "fr");
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentPage(): "chat" | "account" {
    return this.router.url.startsWith("/account") ? "account" : "chat";
  }

  changeLanguage(language: string): void {
    this.setLanguage(language);
  }

  private setLanguage(language: string): void {
    localStorage.setItem("uchat.language", language);
    document.documentElement.lang = language;
    this.translate.use(language);
  }
}
