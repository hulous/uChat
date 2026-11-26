import { inject, NgModule, provideAppInitializer } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr,
} from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { AuthInterceptor } from "./core/interceptors/auth.interceptor";
import { LoginComponent } from "./pages/login/login";
import { RegisterComponent } from "./pages/register/register";
import { AccountComponent } from "./pages/account/account";
import {
  TranslatePipe,
  TranslateService,
  provideTranslateService,
} from "@ngx-translate/core";
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
    TranslatePipe,
  ],
  providers: [
    provideTranslateService({
      fallbackLang: "en",
      loader: provideTranslateHttpLoader({
        prefix: "./assets/i18n/",
        suffix: ".json",
      }),
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      const language = localStorage.getItem("uchat.language") ?? "en";
      localStorage.setItem("uchat.language", language);
      document.documentElement.lang = language;
      return translate.use(language);
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
})
export class AppModule {}
