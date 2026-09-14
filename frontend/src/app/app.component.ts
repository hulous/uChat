import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, TranslateModule],
  templateUrl: "./app.component.html",
})
export class AppComponent {
  constructor(private readonly translate: TranslateService) {
    this.translate.use(localStorage.getItem("uchat.language") ?? "fr");
  }

  changeLanguage(language: string): void {
    localStorage.setItem("uchat.language", language);
    this.translate.use(language);
  }
}
