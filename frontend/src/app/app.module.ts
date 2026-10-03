import { inject, NgModule, provideAppInitializer } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { AuthInterceptor } from "./core/interceptors/auth.interceptor";
import { LoginComponent } from "./pages/login/login";
import { RegisterComponent } from "./pages/register/register";
import { AccountComponent } from "./pages/account/account";
import { TranslateModule } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    AppComponent,
    LoginComponent,
    RegisterComponent,
    AccountComponent,
    TranslateModule.forRoot({
      defaultLanguage: "fr",
      loader: provideTranslateHttpLoader({
        prefix: "./assets/i18n/",
        suffix: ".json",
      }),
    }),
  ],
  providers: [
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      const language = localStorage.getItem("uchat.language") ?? "fr";
      localStorage.setItem("uchat.language", language);
      document.documentElement.lang = language;
      return translate.use(language);
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {}
