import { Component, Input } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { UserNavigationComponent } from "../user-navigation/user-navigation";

@Component({
  selector: "app-page-header",
  imports: [TranslateModule, UserNavigationComponent],
  templateUrl: "./page-header.html",
})
export class PageHeaderComponent {
  @Input({ required: true }) titleId = "";
  @Input({ required: true }) titleKey = "";
  @Input({ required: true }) introKey = "";
  @Input() currentPage: "chat" | "account" = "chat";
}
