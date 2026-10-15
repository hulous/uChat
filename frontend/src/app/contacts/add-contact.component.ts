import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslateModule } from "@ngx-translate/core";
import { ChatService } from "../core/services/chat.service";
import { UserResponse } from "../core/models/user-response.interface";
import { PageHeaderComponent } from "../shared/page-header/page-header";

@Component({
  selector: "app-add-contact",
  imports: [FormsModule, TranslateModule, PageHeaderComponent],
  templateUrl: "./add-contact.component.html",
})
export class AddContactComponent {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  readonly contactError = signal("");
  readonly isAdding = signal(false);
  readonly contacts = signal<UserResponse[]>([]);
  contactEmail = "";

  get currentPage(): "chat" | "account" {
    return this.router.url.startsWith("/account") ? "account" : "chat";
  }

  constructor() {
    void this.refreshContacts();
  }

  async refreshContacts(): Promise<void> {
    this.contacts.set(await firstValueFrom(this.chatService.listContacts()));
  }

  async addContact(): Promise<void> {
    const email = this.contactEmail.trim();
    if (!email || this.isAdding()) {
      return;
    }

    this.contactError.set("");
    this.isAdding.set(true);
    try {
      await firstValueFrom(this.chatService.addContact(email));
      this.contactEmail = "";
      await this.refreshContacts();
      this.contactError.set("");
    } catch {
      this.contactError.set("contacts.error");
    } finally {
      this.isAdding.set(false);
    }
  }

  async removeContact(userId: number): Promise<void> {
    await firstValueFrom(this.chatService.removeContact(userId));
    this.contacts.update((contacts) =>
      contacts.filter((contact) => contact.id !== userId),
    );
  }
}
