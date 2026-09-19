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
    this.setLanguage(localStorage.getItem("uchat.language") ?? "fr");
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
