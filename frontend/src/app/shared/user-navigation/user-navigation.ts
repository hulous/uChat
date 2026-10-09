import { Component, Input } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { AuthService } from "../../core/services/auth";

@Component({
  selector: "app-user-navigation",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./user-navigation.html",
})
export class UserNavigationComponent {
  @Input() currentPage: "chat" | "account" = "chat";

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  logout(): void {
    this.authService.logout();
    void this.router.navigate(["/login"]);
  }
}
